import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

const MEMBERS_SHEET = "Members";
const ATTENDANCE_SHEET = "AttendanceHistory";

type MemberRole = "운영진" | "정회원" | "준회원" | "휴면" | "탈퇴";
type MemberRow = Record<string, string>;

function normalizeBool(v: string) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "활동";
}

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

async function readSheetAsRows(sheetName: string, range = "A1:Z") {
  const values = await getValues(`${sheetName}!${range}`);
  if (values.length === 0) return { headers: [], rows: [] as MemberRow[] };

  const headers = values[0].map((h) => String(h ?? "").trim());
  const rows: MemberRow[] = [];

  for (let i = 1; i < values.length; i += 1) {
    const rowVals = values[i];
    const obj: MemberRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      if (!key) continue;
      obj[key] = String(rowVals?.[c] ?? "").trim();
    }
    rows.push(obj);
  }
  return { headers, rows };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(y: number, m1: number) {
  return new Date(Date.UTC(y, m1, 0)).getUTCDate();
}

function getKSTDateParts() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")) };
}

function rangeForQuarterKST() {
  const { y, m } = getKSTDateParts();
  const startMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    start: `${y}-${pad2(startMonth)}-01`,
    end: `${y}-${pad2(endMonth)}-${pad2(lastDayOfMonth(y, endMonth))}`,
  };
}

function rangeForHalfKST() {
  const { y, m } = getKSTDateParts();
  const startMonth = m <= 6 ? 1 : 7;
  const endMonth = m <= 6 ? 6 : 12;
  return {
    start: `${y}-${pad2(startMonth)}-01`,
    end: `${y}-${pad2(endMonth)}-${pad2(lastDayOfMonth(y, endMonth))}`,
  };
}

function inRangeISO(dateISO: string, startISO: string, endISO: string) {
  return dateISO >= startISO && dateISO <= endISO;
}

function toISODateFromDot(dateRaw: string) {
  const s = String(dateRaw ?? "").trim();
  if (!s) return "";

  const compact = s.replace(/\s+/g, "");
  const parts = compact.split(".").filter(Boolean);
  if (parts.length < 3) return "";

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";

  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const name = (url.searchParams.get("name") ?? "").trim();
    const rolesParam = (url.searchParams.get("roles") ?? "").trim();
    const attendanceUnder = (url.searchParams.get("attendance_under") ?? "").trim(); // quarter|half

    // 1) Members 로드
    const { rows: members } = await readSheetAsRows(MEMBERS_SHEET, "A1:Z");

    // 2) 기본 필터: name / roles
    let filtered = members;

    if (name) {
      filtered = filtered.filter((m) => (m["name"] ?? "").includes(name));
    }

    if (rolesParam) {
      filtered = filtered.filter((m) => (m["role"] ?? "").trim() === rolesParam);
    }

    // 3) 출석 미달 필터
    let totalScoreByMember: Map<string, number> | null = null;

    if (attendanceUnder === "quarter" || attendanceUnder === "half") {
      const activeCandidates = filtered.filter((m) => {
        const role = ((m["role"] ?? "").trim() as MemberRole) || "";
        const active = normalizeBool(m["is_active"] ?? "");
        if (!active) return false;
        return role === "운영진" || role === "정회원" || role === "준회원";
      });

      const { start, end } =
        attendanceUnder === "quarter" ? rangeForQuarterKST() : rangeForHalfKST();

      const { rows: attendanceRows } = await readSheetAsRows(ATTENDANCE_SHEET, "A1:Z");

      const sumByMember = new Map<string, number>();
      for (const r of attendanceRows) {
        const memberId = (r["member_id"] ?? "").trim();
        if (!memberId) continue;

        const dateISO = toISODateFromDot((r["date"] ?? "").trim());
        if (!dateISO) continue;
        if (!inRangeISO(dateISO, start, end)) continue;

        const score = Number((r["score"] ?? "0").trim());
        if (!Number.isFinite(score)) continue;

        sumByMember.set(memberId, (sumByMember.get(memberId) ?? 0) + score);
      }

      totalScoreByMember = sumByMember;

      filtered = activeCandidates.filter((m) => {
        const role = ((m["role"] ?? "").trim() as MemberRole) || "";
        const memberId = (m["member_id"] ?? "").trim();
        const total = sumByMember.get(memberId) ?? 0;

        if (attendanceUnder === "quarter") {
          if (!(role === "운영진" || role === "정회원")) return false;
          return total < 3;
        }

        if (role !== "준회원") return false;
        return total < 4;
      });
    }

    // 4) 응답(조회/관리 공통 필드 + total_score 선택적)
    const result = filtered
      .map((m) => {
        const member_id = (m["member_id"] ?? "").trim();

        const out: {
          member_id: string;
          name: string;
          role: string;

          phone_number: string;
          school: string;
          level: string;
          
          gender: string;
          birth_year: string;
          region: string;
          join_date: string;
          last_updated_at: string;
          comment: string;

          total_score?: number;
        } = {
          member_id,
          name: (m["name"] ?? "").trim(),
          role: (m["role"] ?? "").trim(),

          phone_number: (m["phone_number"] ?? "").trim(),
          school: (m["school"] ?? "").trim(),
          level: (m["level"] ?? "").trim(),

          gender: (m["gender"] ?? "").trim(),
          birth_year: (m["birth_year"] ?? "").trim(),
          region: (m["region"] ?? "").trim(),
          join_date: (m["join_date"] ?? "").trim(),
          last_updated_at: (m["last_updated_at"] ?? "").trim(),
          comment: (m["comment"] ?? "").trim(),
        };

        if (totalScoreByMember) {
          out.total_score = totalScoreByMember.get(member_id) ?? 0;
        }

        return out;
      })
      .filter((m) => m.member_id && m.name && m.role);

    return NextResponse.json({ ok: true, members: result, });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
