import { NextResponse } from "next/server";
import { readSheetObjects } from "@/lib/server/googleSheets";

const ACTIVE_ROLES = ["운영진", "정회원", "준회원", "OB"] as const;
type ActiveRole = (typeof ACTIVE_ROLES)[number];

function asBool(v: unknown) {
  if (typeof v === "boolean") return v;
  return String(v).toLowerCase() === "true";
}

function toScore(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace("+", ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDateLoose(input?: string): Date | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length >= 8) {
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6));
    const d = Number(digits.slice(6, 8));
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const dt2 = new Date(raw);
  return Number.isNaN(dt2.getTime()) ? null : dt2;
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
}

function endOfQuarterExclusive(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 1, 0, 0, 0, 0);
}

export async function GET() {
  try {
    const [members, attendance] = await Promise.all([
      readSheetObjects("Members"),
      readSheetObjects("AttendanceHistory"),
    ]) as [Record<string, string>[], Record<string, string>[]];

    // ── 1) 회원 현황 ──────────────────────────────────────────
    const memberStats: Record<string, number> = {
      운영진: 0, 정회원: 0, 준회원: 0, OB: 0, 휴면: 0, 탈퇴: 0,
    };

    const activeMembers: { memberId: string; name: string; role: ActiveRole }[] = [];

    for (const m of members) {
      const role = String(m["role"] ?? "").trim();
      const active = asBool(m["is_active"] ?? "");
      const memberId = String(m["member_id"] ?? "").trim();
      const name = String(m["name"] ?? "").trim();

      if (role in memberStats) memberStats[role]++;

      if (active && (ACTIVE_ROLES as readonly string[]).includes(role) && memberId && name) {
        activeMembers.push({ memberId, name, role: role as ActiveRole });
      }
    }

    // ── 2) 이번 분기 점수 집계 ────────────────────────────────
    const now = new Date();
    const qStart = startOfQuarter(now);
    const qEnd = endOfQuarterExclusive(now);

    const scoreMap = new Map<string, number>();
    for (const row of attendance) {
      const dt = parseDateLoose(row["date"]);
      if (!dt) continue;
      const t = dt.getTime();
      if (t < qStart.getTime() || t >= qEnd.getTime()) continue;

      const memberId = String(row["member_id"] ?? "").trim();
      if (!memberId) continue;

      const s = toScore(row["score"]);
      scoreMap.set(memberId, (scoreMap.get(memberId) ?? 0) + s);
    }

    // ── 3) 순위 배열 생성 ─────────────────────────────────────
    const quarterRanking = activeMembers
      .map((m) => ({ ...m, score: scoreMap.get(m.memberId) ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"));

    return NextResponse.json({
      ok: true,
      memberStats,
      quarterRanking,
      quarterLabel: `${now.getFullYear()}년 ${Math.floor(now.getMonth() / 3) + 1}분기`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "대시보드 조회 실패";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
