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

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_ID');
  return spreadsheetId;
}

export async function readValues(range: string) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values ?? [];
}

export async function appendValues(range: string, values: (string | number | null)[][]) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * ✅ 추가: 특정 range에 값 업데이트 (행 단위 업데이트/업서트에 필요)
 */
export async function updateValues(range: string, values: (string | number | null)[][]) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

/**
 * ✅ 추가: sheetName(예: "Members", "CalendarMemo") 전체를 (header+rows) 형태로 읽기
 * - header 포함 2차원 배열 반환
 */
export async function getSheetMatrix(sheetName: string): Promise<(string | number | null)[][]> {
  // Google Sheets API에서 range에 sheetName만 주면 해당 시트의 "사용된 범위"를 가져온다
  const values = await readValues(sheetName);
  return values as (string | number | null)[][];
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
/**
 * ✅ 추가: 시트 이름만 주면 헤더 기반 객체 배열로 반환 (calendarMemoService 호환용)
 * - 내부적으로 readSheetObjects를 재사용
 * - 범위는 넉넉하게 A1:Z 로 잡음
 */
export async function getRows<T extends Record<string, any>>(sheetName: string): Promise<T[]> {
  const objs = await readSheetObjects(`${sheetName}!A1:Z`);
  return objs as T[];
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
// ✅ 기존: updateRowByKey
// (내부에서 getSheetsClient 재사용하도록만 정리)
// ------------------------------
type SheetObject = Record<string, any>;

/**
 * Members 같은 시트에서
 * 1) header 기준으로 keyColumnName/keyValue row를 찾고
 * 2) 기존 row를 객체로 만든 뒤 patch를 merge
 * 3) header 순서대로 한 줄을 재구성해 update
 */
export async function updateRowByKey(
  sheetName: string,
  keyColumnName: string,
  keyValue: string,
  patch: Record<string, any>,
) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();

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

/**
 * ✅ 추가: 복합키(date+slot 같은) 기준으로 upsert
 * - header 기반으로 row를 찾아 patch 적용 후 업데이트
 * - 없으면 header 순서에 맞춰 새 row를 만들어 append
 *
 * 예)
 * await upsertRowByCompositeKey("CalendarMemo",
 *   [{column:"date", value:"2025-12-18"}, {column:"slot", value:"1"}],
 *   { meeting_type:"regular", assignee:"보영", gym_name:"크블", max_people:20, updated_at: nowKSTString(), is_deleted:"FALSE" }
 * )
 */
export async function upsertRowByCompositeKey(
  sheetName: string,
  keys: Array<{ column: string; value: string }>,
  patch: Record<string, any>,
) {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();

  const matrix = await getSheetMatrix(sheetName);
  if (!matrix || matrix.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty. Please add header row first.`);
  }

  const header = (matrix[0] ?? []).map((h) => String(h ?? '').trim());
  if (header.length === 0) {
    throw new Error(`Sheet "${sheetName}" has no header row.`);
  }

  // key column indexes
  const keyInfos = keys.map((k) => {
    const idx = header.indexOf(k.column);
    if (idx === -1) {
      throw new Error(`Header "${k.column}" not found in sheet "${sheetName}"`);
    }
    return { ...k, idx };
  });

  const dataRows = matrix.slice(1);

  // find matching row
  let foundDataIndex = -1; // 0-based within dataRows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? [];
    const ok = keyInfos.every((k) => String(row[k.idx] ?? '').trim() === String(k.value).trim());
    if (ok) {
      foundDataIndex = i;
      break;
    }
  }

  // helper: build row values following header order
  const buildRowValues = (baseRow: (string | number | null)[]) => {
    const next = Array.from({ length: header.length }, (_, i) => baseRow[i] ?? '');

    // ensure keys always set
    for (const k of keyInfos) {
      next[k.idx] = k.value;
    }

    // apply patch
    for (const [col, val] of Object.entries(patch)) {
      const idx = header.indexOf(col);
      if (idx === -1) continue; // ignore unknown columns
      next[idx] = val === null || val === undefined ? '' : val;
    }

    return next;
  };

  if (foundDataIndex === -1) {
    // append new row
    const emptyBase = new Array(header.length).fill('');
    const newRowValues = buildRowValues(emptyBase);
    await appendValues(`${sheetName}!A:Z`, [newRowValues]);
    return { created: true };
  }

  // update existing row
  const currentRow = dataRows[foundDataIndex] ?? [];
  const newRowValues = buildRowValues(currentRow);

  // convert to sheet row number (header=1, first data row=2)
  const sheetRowNumber = foundDataIndex + 2;
  const endColumnLetter = columnNumberToLetter(header.length);
  const range = `${sheetName}!A${sheetRowNumber}:${endColumnLetter}${sheetRowNumber}`;

  await updateValues(range, [newRowValues]);
  return { created: false };
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
