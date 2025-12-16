import { google } from 'googleapis';

type SheetsClient = ReturnType<typeof google.sheets>;

function getSheetsClient(): SheetsClient {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('Missing Google service account env vars.');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function readValues(range: string) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_ID');

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values ?? [];
}

export async function appendValues(range: string, values: (string | number | null)[][]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_ID');

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * ✅ 추가: 헤더(1행)를 key로 사용해서 객체 배열로 변환해주는 함수
 * range 예: 'Members!A1:M'
 */
export async function readSheetObjects(range: string): Promise<Record<string, string>[]> {
  const values = await readValues(range);
  if (values.length === 0) return [];

  const header = (values[0] ?? []).map((h) => String(h ?? '').trim());
  const rows = values.slice(1);

  return rows
    // 빈 줄 제거
    .filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
    // row -> object
    .map((row) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!key) continue;
        obj[key] = String(row[i] ?? '').trim();
      }
      return obj;
    });
}

// ✅ 기존 코드 호환용 alias(기존 attendanceService.ts가 깨지지 않도록)
export async function appendRows(range: string, rows: (string | number | null)[][]) {
  return appendValues(range, rows);
}

// ✅ KST 현재시각 문자열 (구글시트 created_at 등에 쓰기 좋게)
export function nowKSTString(): string {
  const now = new Date();

  // KST(+09:00) 기준으로 "YYYY-MM-DD HH:mm:ss" 형태
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}


// ------------------------------
// ✅ 추가: updateRowByKey
// ------------------------------
type SheetObject = Record<string, any>;

/**
 * Members 같은 시트에서
 * 1) header 기준으로 keyColumnName/keyValue row를 찾고
 * 2) 기존 row를 객체로 만든 뒤 patch를 merge
 * 3) header 순서대로 한 줄(values)을 재구성해 update
 */
export async function updateRowByKey(
  sheetName: string,
  keyColumnName: string,
  keyValue: string,
  patch: Record<string, any>,
) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_ID is missing');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1) 시트 전체 읽기 (header + data)
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const rows = readRes.data.values;
  if (!rows || rows.length < 2) {
    throw new Error(`Sheet "${sheetName}" has no data rows`);
  }

  const header = rows[0].map((h) => String(h).trim());
  const keyColIndex = header.indexOf(keyColumnName);
  if (keyColIndex === -1) {
    throw new Error(`Key column "${keyColumnName}" not found in sheet "${sheetName}"`);
  }

  // 2) keyValue row 찾기
  const targetRowIndex = rows.findIndex((row, idx) => {
    if (idx === 0) return false;
    return String(row?.[keyColIndex] ?? '').trim() === String(keyValue).trim();
  });

  if (targetRowIndex === -1) {
    throw new Error(`Row with ${keyColumnName}="${keyValue}" not found in sheet "${sheetName}"`);
  }

  const currentRow = rows[targetRowIndex] ?? [];

  // 3) 기존 row -> 객체화
  const currentObj: Record<string, any> = {};
  header.forEach((col, i) => {
    currentObj[col] = currentRow[i] ?? '';
  });

  // 4) patch merge
  const nextObj: Record<string, any> = { ...currentObj, ...patch };

  // 5) header 순서대로 row 재구성
  const newRowValues = header.map((col) => {
    const v = nextObj[col];
    return v === null || v === undefined ? '' : v;
  });

  // 6) 업데이트 범위 계산 (A{row}:<끝컬럼>{row})
  const targetRowNumber = targetRowIndex + 1; // 1-based
  const endColumnLetter = columnNumberToLetter(newRowValues.length);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${targetRowNumber}:${endColumnLetter}${targetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [newRowValues] },
  });
}

/** 1 -> A, 2 -> B, ... 26 -> Z, 27 -> AA ... */
function columnNumberToLetter(n: number) {
  let s = '';
  let num = n;
  while (num > 0) {
    const mod = (num - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}
