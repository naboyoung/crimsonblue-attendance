import { NextResponse } from "next/server";
import {
  listCalendarMemosByMonth,
  upsertCalendarMemo,
  deleteCalendarMemo,
} from "@/lib/server/calendarMemoService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  if (!month) return NextResponse.json({ error: "month is required" }, { status: 400 });

  const data = await listCalendarMemosByMonth(month);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, slot, meeting_type, assignee, gym_name, max_people } = body ?? {};
  if (!date || !slot) return NextResponse.json({ error: "date, slot required" }, { status: 400 });

  await upsertCalendarMemo({
    date,
    slot: Number(slot),
    meeting_type: meeting_type ?? "",
    assignee: assignee ?? "",
    gym_name: gym_name ?? "",
    max_people: Number(max_people ?? 0),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const slot = searchParams.get("slot");
  if (!date || !slot) return NextResponse.json({ error: "date, slot required" }, { status: 400 });

  await deleteCalendarMemo(date, Number(slot) as 1 | 2);
  return NextResponse.json({ ok: true });
}
