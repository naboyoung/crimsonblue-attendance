// src/lib/server/calendarMemoService.ts
import { getRows, upsertRowByCompositeKey } from "./googleSheets";

export type CalendarMemoRow = {
  date: string;        // YYYY-MM-DD
  slot: "1" | "2";     // 1 or 2
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string;  // keep as string for sheets
  updated_at: string;
  is_deleted: string;  // "TRUE" | "FALSE"
};

export type CalendarMemoSlot = 1 | 2;

export type CalendarMemoInput = {
  date: string;
  slot: CalendarMemoSlot;
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: number | string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function monthRange(month: string) {
  // month: YYYY-MM
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${pad2(m)}-01`;
  const endDate = new Date(y, m, 0); // last day of month
  const end = `${y}-${pad2(m)}-${pad2(endDate.getDate())}`;
  return { start, end };
}

export async function listCalendarMemosByMonth(month: string) {
  const { start, end } = monthRange(month);
  const rows = await getRows<CalendarMemoRow>("CalendarMemo");

  const filtered = rows.filter((r) => {
    if (!r?.date || !r?.slot) return false;
    if (String(r.is_deleted).toUpperCase() === "TRUE") return false;
    return r.date >= start && r.date <= end;
  });

  // date -> [slot1?, slot2?] in slot order
  const map: Record<string, CalendarMemoRow[]> = {};
  for (const r of filtered) {
    const key = r.date;
    map[key] ??= [];
    map[key].push(r);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => Number(a.slot) - Number(b.slot));
  }
  return map;
}

export async function upsertCalendarMemo(input: CalendarMemoInput) {
  const now = new Date().toISOString();
  const row: Partial<CalendarMemoRow> = {
    date: input.date,
    slot: String(input.slot) as "1" | "2",
    meeting_type: input.meeting_type ?? "",
    assignee: input.assignee ?? "",
    gym_name: input.gym_name ?? "",
    max_people: String(input.max_people ?? ""),
    updated_at: now,
    is_deleted: "FALSE",
  };

  await upsertRowByCompositeKey(
    "CalendarMemo",
    [
      { column: "date", value: input.date },
      { column: "slot", value: String(input.slot) },
    ],
    row
  );

  return { ok: true };
}

export async function deleteCalendarMemo(date: string, slot: 1 | 2) {
  const now = new Date().toISOString();
  await upsertRowByCompositeKey(
    "CalendarMemo",
    [
      { column: "date", value: date },
      { column: "slot", value: String(slot) },
    ],
    { is_deleted: "TRUE", updated_at: now }
  );

  return { ok: true };
}
