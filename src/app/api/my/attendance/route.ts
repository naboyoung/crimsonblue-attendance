import { NextResponse } from "next/server";
import crypto from "crypto";
import { readSheetObjects } from "@/lib/server/googleSheets";

type MemberRow = {
  member_id?: string;
  name?: string;
  phone_number?: string;
  role?: string; // 운영진/정회원/준회원/휴면/탈퇴 등
  is_active?: string | boolean;
};

type AttendanceRow = {
  member_id?: string;
  date?: string; // 시트 포맷 다양할 수 있음 (예: 2025-12-21, 2025.12.21 등)
  gym_name?: string;
  gym?: string;
  preregistered?: string; // "기존" | "추가"
  attendance_type?: string; // "정상" | "지각" | "불참" 등
  score?: string | number; // "+1" "1" "-1" 등
  writer?: string;
  created_by?: string;
  session_title?: string;
};

function base64urlToBuffer(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function verifyToken(token: string, secret: string): { member_id: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const data = `${h}.${p}`;

  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  const got = base64urlToBuffer(sig);

  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;

  const payloadJson = base64urlToBuffer(p).toString("utf8");
  const payload = JSON.parse(payloadJson) as any;

  if (!payload?.member_id || !payload?.exp) return null;
  if (Date.now() > Number(payload.exp)) return null;

  return { member_id: String(payload.member_id), exp: Number(payload.exp) };
}

function toNumberScore(v: any) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace("+", ""));
  return Number.isFinite(n) ? n : 0;
}

/** "2025-12-21", "2025.12.21", "2025/12/21", "2025. 12. 21" 등 최대한 관대하게 파싱 */
function parseDateLoose(input?: string): Date | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  // 숫자만 뽑아서 YYYY MM DD 추정
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length >= 8) {
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6));
    const d = Number(digits.slice(6, 8));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      const dt = new Date(y, m - 1, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
  }

  // fallback: Date가 알아서 파싱할 수 있으면
  const dt2 = new Date(raw);
  if (!Number.isNaN(dt2.getTime())) return dt2;

  return null;
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3); // 0~3
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
}
function endOfQuarterExclusive(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 1, 0, 0, 0, 0);
}

function startOfHalf(d: Date) {
  const isFirstHalf = d.getMonth() < 6; // 0~5
  return new Date(d.getFullYear(), isFirstHalf ? 0 : 6, 1, 0, 0, 0, 0);
}
function endOfHalfExclusive(d: Date) {
  const isFirstHalf = d.getMonth() < 6;
  return new Date(d.getFullYear(), isFirstHalf ? 6 : 12, 1, 0, 0, 0, 0);
}

type PeriodType = "quarter" | "half";

function getRuleByRole(roleRaw: string | undefined): {
  period: PeriodType;
  threshold: number;
  label: string; // UI에 보여줄 "이번분기/이번반기"
  guidanceText: string | null; // 정회원/준회원만 문구 표시
} {
  const role = String(roleRaw ?? "").trim();

  // 운영진은 문구에서 제외하지만 판정은 정회원 룰로
  if (role === "준회원") {
    return {
      period: "half",
      threshold: 4,
      label: "이번반기",
      guidanceText: "준회원은 반기별로 4점 이상이어야 해요.",
    };
  }

  // 정회원/운영진/그 외(빈값 포함) → 분기 룰로 판정
  return {
    period: "quarter",
    threshold: 3,
    label: "이번분기",
    guidanceText: role === "정회원" ? "정회원은 분기별로 3점 이상이어야 해요." : null,
  };
}

export async function POST(req: Request) {
  try {
    const secret = process.env.MY_AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, code: "SERVER_MISCONFIG", message: "서버 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? "");
    if (!token) {
      return NextResponse.json(
        { ok: false, code: "NO_TOKEN", message: "인증 정보가 없습니다. 다시 시도해 주세요." },
        { status: 401 }
      );
    }

    const verified = verifyToken(token, secret);
    if (!verified) {
      return NextResponse.json(
        { ok: false, code: "INVALID_TOKEN", message: "인증이 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const { member_id } = verified;

    // ✅ 회원 role 확인 (휴면/탈퇴 문구 + 준회원/정회원 룰 적용)
    const members = (await readSheetObjects("Members")) as MemberRow[];
    const me = members.find((m) => String(m.member_id ?? "") === member_id);
    const role = String(me?.role ?? "").trim();

    const memberStatusMessage =
      role === "휴면" ? "휴면회원입니다." : role === "탈퇴" ? "탈퇴회원입니다." : null;

    const rule = getRuleByRole(role);
    const now = new Date();
    const rangeStart = rule.period === "half" ? startOfHalf(now) : startOfQuarter(now);
    const rangeEndExclusive = rule.period === "half" ? endOfHalfExclusive(now) : endOfQuarterExclusive(now);

    const rows = (await readSheetObjects("AttendanceHistory")) as AttendanceRow[];

    const mineAll = rows
      .filter((r) => String(r.member_id ?? "") === member_id)
      .map((r) => {
        const gymName = (r.gym_name ?? r.gym ?? "").toString();
        const writer = (r.writer ?? r.created_by ?? "").toString();
        const dt = parseDateLoose(r.date);
        return {
          date: (r.date ?? "").toString(),
          dateObj: dt,
          gym_name: gymName,
          preregistered: (r.preregistered ?? "").toString(),
          attendance_type: (r.attendance_type ?? "").toString(),
          score: toNumberScore(r.score),
          writer,
          session_title: (r.session_title ?? "").toString(),
        };
      });

    // 기간 필터(이번 분기/이번 반기)
    const mineInPeriod = mineAll.filter((r) => {
      if (!r.dateObj) return false; // 파싱 실패한 건 집계/필터에서 제외 (원하면 바꿀 수 있음)
      const t = r.dateObj.getTime();
      return t >= rangeStart.getTime() && t < rangeEndExclusive.getTime();
    });

    // 최신순(파싱 성공 우선)
    mineAll.sort((a, b) => {
      const ta = a.dateObj?.getTime() ?? -Infinity;
      const tb = b.dateObj?.getTime() ?? -Infinity;
      if (ta !== tb) return tb - ta;
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    const totalScore = mineInPeriod.reduce((acc, cur) => acc + (cur.score ?? 0), 0);
    const gyms = new Set(mineInPeriod.map((x) => x.gym_name).filter(Boolean));
    const gymCount = gyms.size;

    const pass = totalScore >= rule.threshold;

    return NextResponse.json({
      ok: true,
      role,
      memberStatusMessage,
      rule: {
        period: rule.period,
        threshold: rule.threshold,
        label: rule.label,
        guidanceText: rule.guidanceText, // 정회원/준회원만 노출됨
      },
      summary: {
        totalScore,
        gymCount,
        recordCount: mineInPeriod.length,
        pass,
        statusText: pass ? "충족" : "미달",
      },
      // UI는 전체 기록도 보여줄 수 있게 all + inPeriod를 둘 다 제공
      records: mineAll.map(({ dateObj, ...rest }) => rest),
      recordsInPeriod: mineInPeriod.map(({ dateObj, ...rest }) => rest),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
