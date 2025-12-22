import { NextResponse } from "next/server";
import { readSheetObjects } from "@/lib/server/googleSheets";

type ConfigRow = {
  key?: string;
  value?: string;
  note?: string;
};

function toBool(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "on";
}

export async function GET() {
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

    // 캐시 방지(운영진이 켰다/껐다가 즉시 반영되게)
    return NextResponse.json(
      { ok: true, enabled, message },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (e) {
    // 설정 시트가 없거나 읽기 오류가 나면 안전하게 "닫힘" 처리
    return NextResponse.json(
      {
        ok: true,
        enabled: false,
        message: "현재 개인 출석 조회 기간이 아닙니다. 단톡방 공지를 확인해 주세요.",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
