import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

const MEMBERS_SHEET = "Members";
const ATTENDANCE_SHEET = "AttendanceHistory";
const MEMBER_INFO_HISTORY_SHEET = "MemberInfoHistory";

type MemberRole = "운영진" | "정회원" | "준회원" | "OB" | "휴면" | "탈퇴";
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
  // m1: 1-12
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
  const startMonth = Math.floor((m - 1) / 3) * 3 + 1; // 1,4,7,10
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
  // 기대 입력: "2025. 12. 16" 또는 "2025.12.16"
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

/** =========================================
 * ✅ 컬럼 인덱스 → A1 컬럼 문자(A~Z)
 *  - 현재 range가 A1:Z라서 A~Z만 처리
 * ========================================= */
function colIndexToA1(colIndex: number) {
  // 0->A, 1->B ... 25->Z
  if (colIndex < 0 || colIndex > 25) {
    throw new Error("현재 구현은 A~Z까지만 지원합니다.(A1:Z 범위 기준)");
  }
  return String.fromCharCode("A".charCodeAt(0) + colIndex);
}

/** =========================================
 * ✅ member_id 행 찾아서 patch 컬럼만 업데이트
 * ========================================= */
async function updateMemberRowById(memberId: string, patch: Record<string, string>) {
  const sheets = getSheetsClient();

  const { headers, rows } = await readSheetAsRows(MEMBERS_SHEET, "A1:Z");
  const idCol = headers.indexOf("member_id");
  if (idCol < 0) throw new Error("Members 시트에 member_id 컬럼이 없습니다.");

  const rowIndex = rows.findIndex((r) => (r["member_id"] ?? "").trim() === memberId.trim());
  if (rowIndex < 0) throw new Error(`member_id=${memberId} 를 찾을 수 없습니다.`);

  // header가 1행이므로 데이터 첫 행은 2행
  const sheetRowNumber = rowIndex + 2;

  const data: { range: string; values: string[][] }[] = [];

  for (const [key, value] of Object.entries(patch)) {
    const col = headers.indexOf(key);
    if (col < 0) continue; // 시트에 없는 컬럼이면 무시(안전)
    const colLetter = colIndexToA1(col);
    data.push({
      range: `${MEMBERS_SHEET}!${colLetter}${sheetRowNumber}`,
      values: [[String(value ?? "")]],
    });
  }

  if (data.length === 0) {
    throw new Error("반영할 컬럼이 없습니다. (시트 헤더와 patch 키를 확인하세요)");
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID!,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });
}

/** =========================================
 * ✅ KST 시간 문자열 / history_id / appendRows
 * ========================================= */
function nowKSTString() {
  // "YYYY-MM-DD HH:mm:ss" (KST)
  const d = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function makeHistoryId() {
  // 예: H20251221-113012-4821
  const stamp = nowKSTString().replace(/[-:\s]/g, ""); // YYYYMMDDHHmmss
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `H${stamp}-${rnd}`;
}

async function appendRows(sheetName: string, rows: (string | number)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

/** ======================================================
 * ✅ GET: (기존 조회 로직)
 * ====================================================== */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const name = (url.searchParams.get("name") ?? "").trim();
    const rolesParam = (url.searchParams.get("roles") ?? "").trim(); // 단일 role
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

    // 3) 출석 미달 필터(있을 때만 total_score 계산)
    let totalScoreByMember: Map<string, number> | null = null;

    if (attendanceUnder === "quarter" || attendanceUnder === "half") {
      // 활동 대상자만 (운영진/정회원/준회원 + is_active=true)
      const activeCandidates = filtered.filter((m) => {
        const role = ((m["role"] ?? "").trim() as MemberRole) || "";
        const active = normalizeBool(m["is_active"] ?? "");
        if (!active) return false;
        return role === "운영진" || role === "정회원" || role === "준회원" || role === "OB";
      });

      // 기간 결정(KST 기준)
      const { start, end } =
        attendanceUnder === "quarter" ? rangeForQuarterKST() : rangeForHalfKST();

      // AttendanceHistory 로드
      const { rows: attendanceRows } = await readSheetAsRows(ATTENDANCE_SHEET, "A1:Z");

      // member_id별 score 합산
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

      // 기준 비교(미달자만)
      filtered = activeCandidates.filter((m) => {
        const role = ((m["role"] ?? "").trim() as MemberRole) || "";
        const memberId = (m["member_id"] ?? "").trim();
        const total = sumByMember.get(memberId) ?? 0;

        if (attendanceUnder === "quarter") {
          // 운영진/정회원/준회원: 분기 4점 미달자
          if (!(role === "운영진" || role === "정회원" || role === "준회원")) return false;
          return total < 4;
        }

        // half: OB 반기 6점 미달자
        if (role !== "OB") return false;
        return total < 6;
      });
    }

    // 4) 응답(조회/관리 UI에서 공통으로 쓸 필드 + total_score 선택적)
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

          total_score?: number;
        } = {
          member_id,
          name: (m["name"] ?? "").trim(),
          role: (m["role"] ?? "").trim(),

          phone_number: (m["phone_number"] ?? "").trim(),
          school: (m["school"] ?? "").trim(),
          level: (m["level"] ?? "").trim(),
        };

        if (totalScoreByMember) {
          out.total_score = totalScoreByMember.get(member_id) ?? 0;
        }

        return out;
      })
      .filter((m) => m.member_id && m.name && m.role);

    return NextResponse.json({ ok: true, members: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

/** ======================================================
 * ✅ POST: 회원관리 변경사항 반영 + MemberInfoHistory 로그 남기기
 *
 * ✅ 프론트(ApplyConfirmModal) body:
 * - ROLE_STATUS:
 *   { kind:"ROLE_STATUS", action, targetMemberIds:[], changedBy }
 * - PROFILE_EDIT:
 *   { kind:"PROFILE_EDIT", action, targetMemberIds:[], payload:{ newValue }, changedBy }
 * ====================================================== */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
    }

    const mode = (body.kind ?? body.mode) as "ROLE_STATUS" | "PROFILE_EDIT"; // ✅ kind 우선
    const action = String(body.action ?? "").trim();
    const changedBy = String(body.changedBy ?? "").trim();

    const targetMemberIds = Array.isArray(body.targetMemberIds)
      ? (body.targetMemberIds as string[]).map((v) => String(v ?? "").trim()).filter(Boolean)
      : [];

    const afterValue =
      mode === "PROFILE_EDIT" ? String(body.payload?.newValue ?? "").trim() : "";
    const note = String(body.note ?? "").trim();

    if (!mode) {
      return NextResponse.json({ ok: false, message: "mode(kind)가 없습니다." }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ ok: false, message: "action이 없습니다." }, { status: 400 });
    }
    if (!changedBy) {
      return NextResponse.json(
        { ok: false, message: "changedBy(운영진 이름)가 없습니다." },
        { status: 400 }
      );
    }
    if (!Array.isArray(targetMemberIds) || targetMemberIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "targetMemberIds가 없습니다." },
        { status: 400 }
      );
    }

    // ✅ Members 1번 로드해서 before_value + name 확보
    const { rows: members } = await readSheetAsRows(MEMBERS_SHEET, "A1:Z");
    const memberMap = new Map<string, MemberRow>();
    for (const m of members) {
      const id = String(m["member_id"] ?? "").trim();
      if (id) memberMap.set(id, m);
    }

    const changedAt = nowKSTString();

    // ✅ ROLE_STATUS: role 업데이트 + History append
    if (mode === "ROLE_STATUS") {
      const actionToRole: Record<string, MemberRole | null> = {
        PROMOTE_TO_STAFF: "운영진",
        DEMOTE_FROM_STAFF: "정회원",
        SET_ASSOCIATE: "준회원",
        UNSET_ASSOCIATE_TO_REGULAR: "정회원",
        SET_OB: "OB",
        UNSET_OB_TO_REGULAR: "정회원",
        SET_DORMANT: "휴면",
        UNSET_DORMANT_TO_REGULAR: "정회원",
        SET_WITHDRAWN: "탈퇴",
      };

      const nextRole = actionToRole[action];
      if (!nextRole) {
        return NextResponse.json(
          { ok: false, message: `지원하지 않는 action: ${action}` },
          { status: 400 }
        );
      }

      const historyRows: (string | number)[][] = [];

      for (const memberId of targetMemberIds) {
        const row = memberMap.get(memberId);
        const name = String(row?.["name"] ?? "").trim();
        const beforeRole = String(row?.["role"] ?? "").trim();

        await updateMemberRowById(memberId, {
          role: nextRole,
          last_updated_at: changedAt,
        });

        // history_id | member_id | name | action_type | action_detail | before_value | after_value | changed_by | changed_at | note
        historyRows.push([
          makeHistoryId(),
          memberId,
          name,
          "ROLE_STATUS",
          action,
          beforeRole,
          nextRole,
          changedBy,
          changedAt,
          note,
        ]);
      }

      await appendRows(MEMBER_INFO_HISTORY_SHEET, historyRows);
      return NextResponse.json({ ok: true });
    }

    // ✅ PROFILE_EDIT: 특정 필드 업데이트 + History append
    if (mode === "PROFILE_EDIT") {
      if (targetMemberIds.length !== 1) {
        return NextResponse.json(
          { ok: false, message: "개인정보 수정은 1명만 선택할 수 있습니다." },
          { status: 400 }
        );
      }
      if (!afterValue) {
        return NextResponse.json(
          { ok: false, message: "변경값(payload.newValue)이 비어있습니다." },
          { status: 400 }
        );
      }

      const actionToField: Record<string, "phone_number" | "region" | "level" | null> = {
        UPDATE_PHONE: "phone_number",
        UPDATE_REGION: "region",
        UPDATE_LEVEL: "level",
      };

      const field = actionToField[action];
      if (!field) {
        return NextResponse.json(
          { ok: false, message: `지원하지 않는 action: ${action}` },
          { status: 400 }
        );
      }

      const memberId = targetMemberIds[0];
      const row = memberMap.get(memberId);
      const name = String(row?.["name"] ?? "").trim();
      const before = String(row?.[field] ?? "").trim();

      await updateMemberRowById(memberId, {
        [field]: afterValue,
        last_updated_at: changedAt,
      } as Record<string, string>);

      await appendRows(MEMBER_INFO_HISTORY_SHEET, [
        [
          makeHistoryId(),
          memberId,
          name,
          "PROFILE_EDIT",
          action,
          before,
          afterValue,
          changedBy,
          changedAt,
          "",
        ],
      ]);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, message: "지원하지 않는 mode(kind)" },
      { status: 400 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
