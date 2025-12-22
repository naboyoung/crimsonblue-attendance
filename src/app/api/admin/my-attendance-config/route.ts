import { NextResponse } from "next/server";
import { readSheetObjects, updateRowByKey, appendRows } from "@/lib/server/googleSheets";

type ConfigRow = {
  key?: string;
  value?: string;
  note?: string;
};

function toBoolString(v: boolean) {
  return v ? "TRUE" : "FALSE";
}

function normalizeMessage(s: any) {
  const v = String(s ?? "").trim();
  return v || "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.";
}

function toEnabled(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on";
}

/**
 * ✅ 이 API는 운영진만 접근 가능해야 함.
 * (프로젝트에 이미 운영진 보호가 걸려있다는 전제로 최소 구현)
 */

export async function GET() {
  try {
    const rows = (await readSheetObjects("AdminConfig")) as ConfigRow[];

    const map = new Map<string, string>();
    for (const r of rows) {
      const k = String(r?.key ?? "").trim();
      if (!k) continue;
      map.set(k, String(r?.value ?? "").trim());
    }

    const enabled = toEnabled(map.get("my_attendance_enabled"));
    const message =
      map.get("my_attendance_message") ||
      "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.";

    return NextResponse.json(
      { ok: true, enabled, message },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: true,
        enabled: false,
        message: "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const enabled = Boolean(body?.enabled);
    const message = normalizeMessage(body?.message);

    const rows = (await readSheetObjects("AdminConfig")) as ConfigRow[];

    const hasEnabledKey = rows.some((r) => String(r?.key ?? "").trim() === "my_attendance_enabled");
    const hasMessageKey = rows.some((r) => String(r?.key ?? "").trim() === "my_attendance_message");

    // ✅ 1) enabled 저장
    if (hasEnabledKey) {
      await updateRowByKey("AdminConfig", "key", "my_attendance_enabled", {
        value: toBoolString(enabled),
      });
    } else {
      // appendRows는 "2차원 배열" 형태를 기대함: [[key, value, note]]
      await appendRows("AdminConfig", [
        ["my_attendance_enabled", toBoolString(enabled), "개인 출석 조회 ON/OFF"],
      ]);
    }

    // ✅ 2) message 저장
    if (hasMessageKey) {
      await updateRowByKey("AdminConfig", "key", "my_attendance_message", {
        value: message,
      });
    } else {
      await appendRows("AdminConfig", [
        ["my_attendance_message", message, "OFF 시 안내 문구"],
      ]);
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "설정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
