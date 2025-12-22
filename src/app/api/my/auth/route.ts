import { NextResponse } from "next/server";
import crypto from "crypto";
import { readSheetObjects } from "@/lib/server/googleSheets";

type MemberRow = {
  member_id?: string;
  name?: string;
  phone_number?: string; // "010-1234-5678" 형태 or 빈 값 가능
  role?: string;
  is_active?: string | boolean;
};

type ConfigRow = {
  key?: string;
  value?: string;
  note?: string;
};

function normalizeName(s: string) {
  return s.trim();
}

function last4FromPhone(phone?: string) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signToken(payload: object, secret: string) {
  const header = { alg: "HS256", typ: "MYTOKEN" };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

function toBool(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on";
}

async function getMyAttendanceGate(): Promise<{ enabled: boolean; message: string }> {
  try {
    const rows = (await readSheetObjects("AdminConfig")) as ConfigRow[];
    const map = new Map<string, string>();
    for (const r of rows) {
      const k = String(r?.key ?? "").trim();
      if (!k) continue;
      map.set(k, String(r?.value ?? "").trim());
    }

    const enabled = toBool(map.get("my_attendance_enabled"));
    const message =
      map.get("my_attendance_message") ||
      "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.";

    return { enabled, message };
  } catch {
    // 오류 시 안전하게 닫힘
    return {
      enabled: false,
      message: "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.",
    };
  }
}

export async function POST(req: Request) {
  try {
    // ✅ 0) 열람 가능 여부 먼저 체크 (OFF면 인증 자체 차단)
    const gate = await getMyAttendanceGate();
    if (!gate.enabled) {
      return NextResponse.json(
        { ok: false, code: "CLOSED", message: gate.message },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const secret = process.env.MY_AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, code: "SERVER_MISCONFIG", message: "서버 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const name = normalizeName(String(body?.name ?? ""));
    const last4 = String(body?.last4 ?? "").replace(/\D/g, "").slice(-4);

    if (!name || last4.length !== 4) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", message: "이름과 휴대폰번호 뒤 4자리를 확인해 주세요." },
        { status: 400 }
      );
    }

    const members = (await readSheetObjects("Members")) as MemberRow[];

    const target = members.find((m) => {
      if (!m?.name || normalizeName(m.name) !== name) return false;
      const l4 = last4FromPhone(m.phone_number);
      return l4 === last4;
    });

    // 이름은 맞는데 phone_number가 비어있는 사람 처리(문의 안내)
    const hasNameButNoPhone = members.some(
      (m) => m?.name && normalizeName(m.name) === name && !last4FromPhone(m.phone_number)
    );

    if (!target) {
      if (hasNameButNoPhone) {
        return NextResponse.json(
          {
            ok: false,
            code: "NO_PHONE_REGISTERED",
            message: "휴대폰 번호가 등록되어 있지 않습니다. 운영진에게 문의해 주세요.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "일치하는 정보를 찾을 수 없습니다. 입력값을 확인해 주세요." },
        { status: 404 }
      );
    }

    if (!target.member_id) {
      return NextResponse.json(
        { ok: false, code: "BROKEN_MEMBER_ROW", message: "회원 정보가 올바르지 않습니다. 운영진에게 문의해 주세요." },
        { status: 500 }
      );
    }

    // ✅ member_id 조작 방지: 짧은 만료 토큰 발급
    const now = Date.now();
    const exp = now + 10 * 60 * 1000; // 10분
    const token = signToken({ member_id: target.member_id, exp }, secret);

    return NextResponse.json(
      {
        ok: true,
        token,
        profile: {
          member_id: target.member_id,
          name: target.name ?? name,
          role: target.role ?? "",
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
