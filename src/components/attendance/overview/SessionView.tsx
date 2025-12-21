"use client";

import { useEffect, useMemo, useState } from "react";
import Segmented from "@/components/ui/Segmented";
import { Badge } from "@/components/ui/Badge";
import { meetingTypeToVariant } from "@/lib/ui/badgeVariants";

type AttendanceType = "정상" | "지각" | "불참";

type SessionAttendee = {
  memberId: string;
  name: string;
  preregistered: string; // 기존 | 추가
  attendanceType: AttendanceType;
  score: number | null;
};

type SessionSummary = {
  sessionId: string;
  date: string; // YYYY-MM-DD or YYYY. MM. DD etc.
  meetingType: string;
  gymName: string;
  writer: string;

  totalCount: number;
  normalCount: number;
  lateCount: number;
  absentCount: number;

  attendees: SessionAttendee[];
};

type PeriodFilter = "이번달" | "지난달" | "이번분기" | "지난분기" | "전체";
type SortOrder = "회차순" | "역회차순";

/* ---------------- 날짜 유틸 ---------------- */
function parseDateYMD(d: string) {
  const s = String(d ?? "").trim();
  if (!s) return null;

  const normalized = s.replace(/\s+/g, "").replace(/[./]/g, "-");
  const [yStr, mStr, dayStr] = normalized.split("-");

  const y = Number(yStr);
  const m = Number(mStr);
  const day = Number(dayStr);

  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function formatDateDot(d: string) {
  const dt = parseDateYMD(d);
  if (!dt) return String(d ?? "").trim();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${day}`;
}

function getQuarter(m0: number) {
  return Math.floor(m0 / 3) + 1;
}

/* ---------------- 출석자 테이블(출석등록 톤) ---------------- */
function AttendeeTableBox({
  attendees,
}: {
  attendees: Array<{ name: string; preregistered: string; attendanceType: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        <div className="text-center">이름</div>
        <div className="text-center">유형</div>
        <div className="text-center">형태</div>
      </div>

      {attendees.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-500">
          아직 추가된 출석자가 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {attendees.map((a, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm text-slate-700">
              <div className="text-center text-slate-600">{a.name}</div>
              <div className="text-center text-slate-600">{a.preregistered}</div>
              <div className="text-center text-slate-600">{a.attendanceType}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState<PeriodFilter>("이번달");
  const [sortOrder, setSortOrder] = useState<SortOrder>("역회차순");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  /* ---------- 데이터 로딩 ---------- */
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/attendance/history", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          setError(json?.message ?? "출석현황 조회 실패");
          setSessions([]);
          return;
        }

        setSessions(Array.isArray(json.sessions) ? json.sessions : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  /* ---------- 기간 필터 ---------- */
  const periodFiltered = useMemo(() => {
    if (period === "전체") return sessions;

    const now = new Date();
    const y = now.getFullYear();
    const m0 = now.getMonth();
    const q = getQuarter(m0);

    const prevMonth = new Date(y, m0 - 1, 1);
    const prevMonthY = prevMonth.getFullYear();
    const prevMonthM0 = prevMonth.getMonth();

    let prevQ = q - 1;
    let prevQY = y;
    if (prevQ === 0) {
      prevQ = 4;
      prevQY = y - 1;
    }

    return sessions.filter((s) => {
      const d = parseDateYMD(s.date);
      if (!d) return false;

      if (period === "이번달") return d.getFullYear() === y && d.getMonth() === m0;
      if (period === "지난달") return d.getFullYear() === prevMonthY && d.getMonth() === prevMonthM0;
      if (period === "이번분기") return d.getFullYear() === y && getQuarter(d.getMonth()) === q;
      if (period === "지난분기") return d.getFullYear() === prevQY && getQuarter(d.getMonth()) === prevQ;

      return true;
    });
  }, [sessions, period]);

  /* ---------- 정렬 ---------- */
  const displaySessions = useMemo(() => {
    if (period !== "전체") {
      return [...periodFiltered].sort((a, b) => {
        return (parseDateYMD(b.date)?.getTime() ?? 0) - (parseDateYMD(a.date)?.getTime() ?? 0);
      });
    }

    const arr = [...periodFiltered];
    arr.sort((a, b) => {
      const diff = Number(a.sessionId) - Number(b.sessionId);
      return sortOrder === "회차순" ? diff : -diff;
    });
    return arr;
  }, [periodFiltered, period, sortOrder]);

  const toggleExpand = (sid: string) => setExpandedSessionId((prev) => (prev === sid ? null : sid));
  const toggleSort = () => setSortOrder((p) => (p === "역회차순" ? "회차순" : "역회차순"));

  return (
    <div className="space-y-3">
      {/* ✅ 전체일 때만 회차 정렬 */}
      <div className="flex items-center justify-end">
        {period === "전체" && (
          <button
            type="button"
            onClick={toggleSort}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            회차 {sortOrder === "역회차순" ? "▼" : "▲"}
          </button>
        )}
      </div>

      <Segmented<PeriodFilter>
        value={period}
        onChange={setPeriod}
        options={[
          { value: "이번달", label: "이번달" },
          { value: "지난달", label: "지난달" },
          { value: "이번분기", label: "이번분기" },
          { value: "지난분기", label: "지난분기" },
          { value: "전체", label: "전체" },
        ]}
      />

      {loading && <div className="text-sm text-slate-500">불러오는 중...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && displaySessions.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">표시할 출석 기록이 없습니다.</div>
          <div className="mt-1 text-xs text-slate-500">
            선택한 기간에 등록된 모임이 없어요. <span className="font-semibold text-slate-800">출석 등록</span>에서 먼저
            등록하거나, 기간 필터를 <span className="font-semibold text-slate-800">전체</span>로 변경해보세요.
          </div>
        </div>
      )}

      {!loading && !error && displaySessions.length > 0 && (
        <div className="max-h-[70vh] overflow-auto pr-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-200">
              {displaySessions.map((s) => {
                const expanded = expandedSessionId === s.sessionId;

                return (
                  <div key={s.sessionId}>
                    <button
                      type="button"
                      className="w-full p-4 text-left transition hover:bg-slate-50"
                      onClick={() => toggleExpand(s.sessionId)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="meeting_regular">{s.sessionId}회</Badge>

                            <Badge variant={meetingTypeToVariant(String(s.meetingType ?? "").trim())}>
                              {s.meetingType}
                            </Badge>

                            <div className="text-sm font-semibold text-slate-900">{formatDateDot(s.date)}</div>
                          </div>

                          <div className="truncate text-base font-semibold text-slate-900">{s.gymName}</div>
                          <div className="text-xs text-slate-500">작성자: {s.writer}</div>

                          <div className="pt-1 text-sm font-semibold text-slate-900">총 출석자 {s.totalCount}명</div>
                          <div className="text-xs text-slate-600">
                            정상 {s.normalCount} · 지각 {s.lateCount} · 불참 {s.absentCount}
                          </div>
                        </div>

                        <div className="shrink-0 pt-1 text-xs text-slate-500">{expanded ? "▲" : "▼"}</div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="bg-slate-50 px-4 pb-4">
                        <AttendeeTableBox
                          attendees={s.attendees.map((a) => ({
                            name: a.name,
                            preregistered: a.preregistered,
                            attendanceType: a.attendanceType,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
