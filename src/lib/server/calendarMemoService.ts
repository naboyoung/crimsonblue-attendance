import { appendValues, nowKSTString, readSheetObjects, updateRowByKey } from "./googleSheets";
import type { CalendarMemoRow } from "@/lib/types/calendarMemo";

export type CalendarMemoSlot = never; // (기존 타입 참조하던 곳 있으면 제거 권장)

export type UpsertCalendarMemoInput = {
  memo_id?: string; // 있으면 수정, 없으면 생성
  date: string;
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: number | string;
};

export type PatchCalendarMemoInput = {
  memo_id: string;
  meeting_type?: string;
  assignee?: string;
  gym_name?: string;
  max_people?: number | string;
};

const SHEET_NAME = "CalendarMemo"; // ✅ 구글시트 탭 이름

function toRowForAppend(input: UpsertCalendarMemoInput & { memo_id: string }): (string | number | null)[] {
  return [
    input.memo_id,
    input.date,
    input.meeting_type ?? "",
    input.assignee ?? "",
    input.gym_name ?? "",
    String(input.max_people ?? ""),
    nowKSTString(),
    "FALSE",
  ];
}

function normalizeRow(r: Record<string, string>): CalendarMemoRow {
  return {
    memo_id: String(r.memo_id ?? "").trim(),
    date: String(r.date ?? "").trim(),
    meeting_type: String(r.meeting_type ?? "").trim(),
    assignee: String(r.assignee ?? "").trim(),
    gym_name: String(r.gym_name ?? "").trim(),
    max_people: String(r.max_people ?? "").trim(),
    updated_at: String(r.updated_at ?? "").trim(),
    is_deleted: String(r.is_deleted ?? "").trim() || "FALSE",
  };
}

export async function listCalendarMemosByMonth(month: string): Promise<Record<string, CalendarMemoRow[]>> {
  // month: "YYYY-MM"
  const rows = await readSheetObjects(`${SHEET_NAME}!A1:Z`);
  const list = rows
    .map(normalizeRow)
    .filter((r) => r.memo_id)
    .filter((r) => r.is_deleted !== "TRUE")
    .filter((r) => r.date.startsWith(month));

  // date별 그룹핑
  const map: Record<string, CalendarMemoRow[]> = {};
  for (const r of list) {
    (map[r.date] ||= []).push(r);
  }

  // ✅ 정렬: updated_at 오름차순(없으면 memo_id)
  for (const date of Object.keys(map)) {
    map[date].sort((a, b) => (a.updated_at || a.memo_id).localeCompare(b.updated_at || b.memo_id));
  }

  return map;
}

export async function upsertCalendarMemo(input: UpsertCalendarMemoInput): Promise<{ memo_id: string }> {
  const memo_id = input.memo_id?.trim() || globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random()}`;

  // ✅ 수정
  if (input.memo_id) {
    await updateRowByKey(SHEET_NAME, "memo_id", memo_id, {
      meeting_type: String(input.meeting_type ?? ""),
      assignee: String(input.assignee ?? ""),
      gym_name: String(input.gym_name ?? ""),
      max_people: String(input.max_people ?? ""),
      updated_at: nowKSTString(),
      is_deleted: "FALSE",
    });
    return { memo_id };
  }

  // ✅ 생성(append)
  await appendValues(`${SHEET_NAME}!A1`, [toRowForAppend({ ...input, memo_id })]);
  return { memo_id };
}

export async function patchCalendarMemo(input: PatchCalendarMemoInput) {
  const memo_id = input.memo_id.trim();
  await updateRowByKey(SHEET_NAME, "memo_id", memo_id, {
    ...(input.meeting_type !== undefined ? { meeting_type: String(input.meeting_type) } : {}),
    ...(input.assignee !== undefined ? { assignee: String(input.assignee) } : {}),
    ...(input.gym_name !== undefined ? { gym_name: String(input.gym_name) } : {}),
    ...(input.max_people !== undefined ? { max_people: String(input.max_people) } : {}),
    updated_at: nowKSTString(),
  });
}

export async function deleteCalendarMemo(memo_id: string) {
  await updateRowByKey(SHEET_NAME, "memo_id", memo_id, {
    is_deleted: "TRUE",
    updated_at: nowKSTString(),
  });
}
