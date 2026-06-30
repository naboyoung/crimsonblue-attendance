"use client";

import { useEffect, useMemo, useState } from "react";
import Segmented from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { roleToVariant } from "@/lib/ui/badgeVariants";

type ActiveRole = "운영진" | "정회원" | "준회원" | "OB";

type RankEntry = {
  memberId: string;
  name: string;
  role: ActiveRole;
  score: number;
};

type DashboardData = {
  memberStats: Record<string, number>;
  quarterRanking: RankEntry[];
  quarterLabel: string;
};

type TopFilter = "전체" | "운영진" | "일반회원";

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

const STAT_ITEMS: { key: string; label: string }[] = [
  { key: "운영진", label: "운영진" },
  { key: "정회원", label: "정회원" },
  { key: "준회원", label: "준회원" },
  { key: "OB", label: "OB" },
];

export function HomeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topFilter, setTopFilter] = useState<TopFilter>("전체");

  useEffect(() => {
    fetch("/api/home/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) throw new Error(json?.message ?? "조회 실패");
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "오류"))
      .finally(() => setLoading(false));
  }, []);

  const top3 = useMemo(() => {
    if (!data) return [];
    const list = data.quarterRanking.filter((m) => {
      if (topFilter === "운영진") return m.role === "운영진";
      if (topFilter === "일반회원") return m.role !== "운영진";
      return true;
    });
    return list.slice(0, 3);
  }, [data, topFilter]);

  return (
    <div className="mt-4 space-y-3">
      {/* ── 회원 현황 ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <div className="text-xs font-semibold text-zinc-500">회원 현황</div>

        {loading ? (
          <div className="mt-2 flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-14" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-2 text-xs text-red-500">{error}</div>
        ) : data ? (
          <>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
              <span>
                전체{" "}
                <span className="font-bold text-zinc-800">
                  {(["운영진", "정회원", "준회원", "OB", "휴면"] as const).reduce(
                    (s, k) => s + (data.memberStats[k] ?? 0),
                    0
                  )}
                </span>
                명
              </span>
              <span className="text-zinc-300">|</span>
              <span>
                활동{" "}
                <span className="font-bold text-zinc-800">
                  {(["운영진", "정회원", "준회원", "OB"] as const).reduce(
                    (s, k) => s + (data.memberStats[k] ?? 0),
                    0
                  )}
                </span>
                명
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {STAT_ITEMS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <Badge variant={roleToVariant(key)}>{label}</Badge>
                  <span className="text-sm font-bold text-zinc-900">
                    {data.memberStats[key] ?? 0}
                  </span>
                  <span className="text-xs text-zinc-400">명</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">
              휴면 {data.memberStats["휴면"] ?? 0}명
            </div>
          </>
        ) : null}
      </div>

      {/* ── 분기 TOP3 ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-500">
            {data ? data.quarterLabel : "이번 분기"} 출석 TOP 3
          </div>
        </div>

        <div className="mt-2">
          <Segmented<TopFilter>
            value={topFilter}
            onChange={setTopFilter}
            options={[
              { value: "전체", label: "전체" },
              { value: "운영진", label: "운영진" },
              { value: "일반회원", label: "일반회원" },
            ]}
          />
        </div>

        <div className="mt-3 space-y-2">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
            ))
          ) : top3.length === 0 ? (
            <div className="py-2 text-center text-xs text-zinc-400">
              이번 분기 출석 기록이 없습니다.
            </div>
          ) : (
            top3.map((m, idx) => (
              <div key={m.memberId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{RANK_EMOJI[idx]}</span>
                  <span className="text-sm font-semibold text-zinc-900">{m.name}</span>
                  <Badge variant={roleToVariant(m.role)}>{m.role}</Badge>
                </div>
                <span className="text-sm font-bold text-zinc-900">{m.score}점</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
