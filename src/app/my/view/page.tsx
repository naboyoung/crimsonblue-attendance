"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecordRow = {
  date: string;
  gym_name: string;
  preregistered: string;
  attendance_type: string;
  score: number;
  writer: string;
  session_title?: string;
};

type ApiResponse = {
  ok: boolean;
  role?: string;
  memberStatusMessage?: string | null;
  rule?: {
    period: "quarter" | "half";
    threshold: number;
    label: string; // 이번분기/이번반기
    guidanceText: string | null;
  };
  summary?: {
    totalScore: number;
    gymCount: number;
    recordCount: number;
    pass: boolean;
    statusText: "충족" | "미달";
  };
  records?: RecordRow[];
  recordsInPeriod?: RecordRow[];
  message?: string;
};

export default function MyAttendanceViewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const [memberStatusMessage, setMemberStatusMessage] = useState<string | null>(null);
  const [ruleLabel, setRuleLabel] = useState<string>("이번분기");
  const [threshold, setThreshold] = useState<number>(3);
  const [guidanceText, setGuidanceText] = useState<string | null>(null);

  const [summary, setSummary] = useState<ApiResponse["summary"] | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsInPeriod, setRecordsInPeriod] = useState<RecordRow[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem("MY_AUTH_TOKEN");
    const n = sessionStorage.getItem("MY_PROFILE_NAME") ?? "";
    const r = sessionStorage.getItem("MY_PROFILE_ROLE") ?? "";
    setName(n);
    setRole(r);

    if (!token) {
      router.replace("/my");
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/my/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "조회에 실패했습니다. 다시 시도해 주세요.");
          return;
        }

        setRole(data.role ?? r);
        setMemberStatusMessage(data.memberStatusMessage ?? null);

        setRuleLabel(data.rule?.label ?? "이번분기");
        setThreshold(data.rule?.threshold ?? 3);
        setGuidanceText(data.rule?.guidanceText ?? null);

        setSummary(data.summary ?? null);
        setRecords(data.records ?? []);
        setRecordsInPeriod(data.recordsInPeriod ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const totalScore = summary?.totalScore ?? 0;
  const gymCount = summary?.gymCount ?? 0;
  const pass = summary?.pass ?? false;

  const badge = useMemo(() => {
    return pass
      ? { text: "충족", cls: "border-slate-200 bg-slate-50 text-slate-700" }
      : { text: "미달", cls: "border-red-200 bg-red-50 text-red-700" };
  }, [pass]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl border bg-white p-4 text-sm">불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-6 space-y-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
        <button className="w-full rounded-xl border bg-white px-3 py-2 text-sm" onClick={() => router.replace("/my")}>
          다시 조회하기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-4">
      {/* 상단 프로필/요약 카드 */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{name || "내 출석"}</div>
            <div className="mt-1 text-sm text-slate-600">
              {ruleLabel} · 방문 암장 <span className="font-semibold">{gymCount}</span>곳
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="rounded-full border px-3 py-1 text-xs font-semibold">{role || "회원"}</div>
            <div className={["rounded-full border px-3 py-1 text-xs font-semibold", badge.cls].join(" ")}>
              {badge.text}
            </div>
          </div>
        </div>

        {/* 휴면/탈퇴 안내 */}
        {memberStatusMessage && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {memberStatusMessage}
          </div>
        )}

        {/* 기준 안내 문구: 정회원/준회원만 */}
        {guidanceText && (
          <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {guidanceText}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div className="text-2xl font-bold">{totalScore}점</div>
          <div className="text-sm text-slate-600">
            기준: {threshold}점 이상
          </div>
        </div>
      </div>

      {/* 기록(기간 내 기록 우선) */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">출석 기록</div>
          <div className="text-xs text-slate-600">{ruleLabel} 기록 {recordsInPeriod.length}건</div>
        </div>

        <div className="mt-3 space-y-2">
          {recordsInPeriod.length === 0 ? (
            <div className="rounded-xl border bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {ruleLabel} 기록이 없습니다.
            </div>
          ) : (
            recordsInPeriod.map((r, idx) => (
              <div key={idx} className="rounded-2xl border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold">{r.gym_name || r.session_title || "세션"}</div>
                  <div className="text-base font-semibold">{r.score >= 0 ? `+${r.score}` : `${r.score}`}</div>
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  {r.date}
                  {r.preregistered ? ` · ${r.preregistered}` : ""}
                  {r.attendance_type ? ` · ${r.attendance_type}` : ""}
                  {r.writer ? ` · 작성자: ${r.writer}` : ""}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold">
          {ruleLabel} 총 점수: {totalScore}점
        </div>
      </div>

      {/* 전체 기록(옵션: 접기/펼치기 없이 깔끔하게 아래에 표시) */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">전체 기록</div>
        <div className="mt-3 space-y-2">
          {records.length === 0 ? (
            <div className="rounded-xl border bg-slate-50 px-3 py-3 text-sm text-slate-600">전체 기록이 없습니다.</div>
          ) : (
            records.slice(0, 30).map((r, idx) => (
              <div key={idx} className="rounded-2xl border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold">{r.gym_name || r.session_title || "세션"}</div>
                  <div className="text-base font-semibold">{r.score >= 0 ? `+${r.score}` : `${r.score}`}</div>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {r.date}
                  {r.preregistered ? ` · ${r.preregistered}` : ""}
                  {r.attendance_type ? ` · ${r.attendance_type}` : ""}
                </div>
              </div>
            ))
          )}
          {records.length > 30 && (
            <div className="text-xs text-slate-500">※ 최근 30건까지만 표시 중</div>
          )}
        </div>
      </div>

      <button
        className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
        onClick={() => {
          sessionStorage.removeItem("MY_AUTH_TOKEN");
          sessionStorage.removeItem("MY_PROFILE_NAME");
          sessionStorage.removeItem("MY_PROFILE_ROLE");
          router.replace("/my");
        }}
      >
        다른 정보로 조회하기
      </button>
    </div>
  );
}
