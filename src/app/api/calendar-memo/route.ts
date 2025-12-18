import { NextResponse } from "next/server";
import {
  deleteCalendarMemo,
  listCalendarMemosByMonth,
  patchCalendarMemo,
  upsertCalendarMemo,
} from "@/lib/server/calendarMemoService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  if (!month) return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });

  const data = await listCalendarMemosByMonth(month);
  return NextResponse.json({ data });
}

// ✅ 생성
export async function POST(req: Request) {
  const body = await req.json();
  const { date, meeting_type, assignee, gym_name, max_people } = body ?? {};

  if (!date) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  const assigneeStr = String(assignee ?? "").trim();
  if (!assigneeStr) {
    return NextResponse.json({ error: "assignee is required" }, { status: 400 });
  }

  const res = await upsertCalendarMemo({
    date: String(date),
    meeting_type: String(meeting_type ?? ""),
    assignee: assigneeStr, // ✅ trim된 값 사용
    gym_name: String(gym_name ?? ""),
    max_people: max_people ?? "",
  });

  return NextResponse.json({ ok: true, memo_id: res.memo_id });
}

// ✅ 수정
export async function PUT(req: Request) {
  const body = await req.json();
  const { memo_id, meeting_type, assignee, gym_name, max_people } = body ?? {};

  if (!memo_id) return NextResponse.json({ error: "memo_id is required" }, { status: 400 });

  // ✅ assignee를 수정하려는 경우엔 빈 값 방지
  if (assignee !== undefined) {
    const assigneeStr = String(assignee ?? "").trim();
    if (!assigneeStr) {
      return NextResponse.json({ error: "assignee cannot be empty" }, { status: 400 });
    }
  }

  await patchCalendarMemo({
    memo_id: String(memo_id),
    ...(meeting_type !== undefined ? { meeting_type: String(meeting_type) } : {}),
    ...(assignee !== undefined ? { assignee: String(assignee).trim() } : {}),
    ...(gym_name !== undefined ? { gym_name: String(gym_name ?? "") } : {}),
    ...(max_people !== undefined ? { max_people } : {}),
  });

  return NextResponse.json({ ok: true });
}

// ✅ 삭제
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const memo_id = searchParams.get("memo_id");
  if (!memo_id) return NextResponse.json({ error: "memo_id is required" }, { status: 400 });

  await deleteCalendarMemo(String(memo_id));
  return NextResponse.json({ ok: true });
}
