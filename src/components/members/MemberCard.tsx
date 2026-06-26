"use client";

import type { Role } from "./MemberRoleFilterChips";
import { Badge } from "@/components/ui/Badge";
import { roleToVariant } from "@/lib/ui/badgeVariants";

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
  dormancy_count?: string;
};

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

export function MemberCard(props: { member: Member; onClick: () => void }) {
  const { member, onClick } = props;

  const newbie = isNewbie(member.join_date);

  const roleText = (member.role ?? "").toString().trim();
  const schoolText = (member.school ?? "").toString().trim();
  const levelText = (member.level ?? "").toString().trim();

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold text-zinc-900">
              {member.name || "(이름 없음)"}
            </div>
            {newbie && <Badge variant="newbie">신입</Badge>}
          </div>

          <div className="mt-1 text-sm text-zinc-600">
            {member.phone_number || "연락처없음"}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex justify-end">
            <Badge variant={roleToVariant(roleText)}>{roleText || "없음"}</Badge>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Badge variant={schoolText ? "meeting_regular" : "muted"}>
              {schoolText || "없음"}
            </Badge>
            <Badge variant={levelText ? "meeting_regular" : "muted"}>
              {levelText || "없음"}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  );
}
