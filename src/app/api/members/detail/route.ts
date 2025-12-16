import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

const MEMBERS_SHEET = "Members";

type MemberRow = Record<string, string>;

function getSheetsClient() {
  if (!SHEET_ID) throw new Error("GOOGLE_SHEETS_ID가 없습니다.");
  if (!CLIENT_EMAIL) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL이 없습니다.");
  if (!PRIVATE_KEY) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY가 없습니다.");

  const jwt = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth: jwt });
}

async function getValues(rangeA1: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: rangeA1,
  });
  return (res.data.values ?? []) as (string | number)[][];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const memberId = (url.searchParams.get("member_id") ?? "").trim();

    if (!memberId) {
      return NextResponse.json({ ok: false, message: "member_id가 필요합니다." }, { status: 400 });
    }

    const values = await getValues(`${MEMBERS_SHEET}!A1:Z`);
    if (values.length === 0) {
      return NextResponse.json({ ok: false, message: "Members 시트가 비어있습니다." }, { status: 500 });
    }

    const headers = values[0].map((h) => String(h ?? "").trim());
    const idx = new Map<string, number>();
    headers.forEach((h, i) => h && idx.set(h, i));

    const need = ["member_id", "phone_number", "region", "level"];
    for (const k of need) {
      if (!idx.has(k)) {
        return NextResponse.json(
          { ok: false, message: `Members 시트에 '${k}' 컬럼이 없습니다.` },
          { status: 500 }
        );
      }
    }

    for (let r = 1; r < values.length; r += 1) {
      const row = values[r];
      const curId = String(row[idx.get("member_id")!] ?? "").trim();
      if (curId !== memberId) continue;

      const phone = String(row[idx.get("phone_number")!] ?? "").trim();
      const region = String(row[idx.get("region")!] ?? "").trim();
      const level = String(row[idx.get("level")!] ?? "").trim();

      return NextResponse.json({
        ok: true,
        member: { member_id: memberId, phone_number: phone, region, level },
      });
    }

    return NextResponse.json({ ok: false, message: "해당 member_id를 찾을 수 없습니다." }, { status: 404 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
