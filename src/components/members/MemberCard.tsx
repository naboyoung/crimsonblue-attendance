"use client";

import type { Role } from "./MemberRoleFilterChips";

/* ✅ 반드시 export */
export type Member = {
  member_id?: string;
  name?: string;
  role?: Role | string;
  is_active?: string;
  school?: string;
  gender?: string;
  birth_year?: string;
  phone_number?: string;
  region?: string;
  level?: string;
  join_date?: string;
  last_updated_at?: string;
  comment?: string;
};

function badgeClass(kind: "primary" | "muted" | "newbie") {
  if (kind === "newbie") {
    return "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200";
  }
  if (kind === "primary") {
    return "inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200";
  }
  return "inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400";
}

function parseJoinDateYM(joinDate: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(joinDate.trim());
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
}

function nowKSTYearMonth() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    y: Number(parts.find((p) => p.type === "year")?.value ?? ""),
    m: Number(parts.find((p) => p.type === "month")?.value ?? ""),
  };
}

function isNewbie(joinDate?: string) {
  if (!joinDate) return false;
  const jm = parseJoinDateYM(joinDate);
  if (!jm) return false;

  const now = nowKSTYearMonth();
  const diff = now.y * 12 + now.m - (jm.y * 12 + jm.m);
  return diff >= 0 && diff <= 5;
}

export function MemberCard(props: {
  member: Member;
  onClick: () => void;
}) {
  const { member, onClick } = props;

  const newbie = isNewbie(member.join_date);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 transition dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold truncate">
              {member.name || "(이름 없음)"}
            </div>
            {newbie && <span className={badgeClass("newbie")}>신입</span>}
          </div>

          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {member.phone_number || "연락처없음"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={badgeClass("primary")}>{member.role || "없음"}</span>
          <div className="flex gap-2">
            <span className={member.school ? badgeClass("primary") : badgeClass("muted")}>
              {member.school || "없음"}
            </span>
            <span className={member.level ? badgeClass("primary") : badgeClass("muted")}>
              {member.level || "없음"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
