import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

const MEMBERS_SHEET = "Members";

function getSheetsClient() {
  if (!SHEET_ID) throw new Error("GOOGLE_SHEETS_ID가 없습니다.");
  if (!CLIENT_EMAIL) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL이 없습니다.");
  if (!PRIVATE_KEY) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY가 없습니다.");

  const jwt = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
    const prefix = (url.searchParams.get("prefix") ?? "").trim();
    if (!prefix) return NextResponse.json({ ok: true, suggestions: [] });

    const values = await getValues(`${MEMBERS_SHEET}!A1:Z`);
    if (values.length === 0) return NextResponse.json({ ok: true, suggestions: [] });

    const headers = values[0].map((h) => String(h ?? "").trim());
    const nameIdx = headers.findIndex((h) => h === "name");
    if (nameIdx < 0) return NextResponse.json({ ok: true, suggestions: [] });

    const p = prefix.toLowerCase();
    const set = new Set<string>();

    for (let r = 1; r < values.length; r += 1) {
      const name = String(values[r]?.[nameIdx] ?? "").trim();
      if (!name) continue;
      if (name.toLowerCase().includes(p)) set.add(name);
      if (set.size >= 8) break;
    }

    return NextResponse.json({ ok: true, suggestions: Array.from(set) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message: `members/suggest 오류: ${msg}` },
      { status: 500 }
    );
  }
}
