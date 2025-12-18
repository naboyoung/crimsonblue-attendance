"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CalendarMemoSheet } from "@/components/home/CalendarMemoSheet";

type CalendarMemoRow = {
  date: string;
  slot: "1" | "2";
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string;
  updated_at: string;
  is_deleted: string;
};

type MonthMemoMap = Record<string, CalendarMemoRow[]>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMonth(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * ✅ 모임유형 dot 컬러 매핑
 * - 너희 프로젝트에 이미 쓰는 색/타입이 있다면, 여기만 “기존 상수”를 import 해서 바꿔 끼우면 됨.
 */
const MEETING_TYPE_DOT_CLASS: Record<string, string> = {
  // 예시 (프로젝트 기존 색상에 맞게 수정)
  regular: "bg-blue-500",
  rental: "bg-red-500",
  etc: "bg-gray-400",
};

function Dot({ meetingType }: { meetingType: string }) {
  const cls = MEETING_TYPE_DOT_CLASS[meetingType] ?? "bg-gray-400";
  return <span className={`mt-[3px] inline-block h-2 w-2 rounded-full ${cls}`} />;
}

/**
 * ✅ 반드시 named export로 제공 (import { HomeCalendar } 가능)
 */
export function HomeCalendar() {
  const [cursorMonth, setCursorMonth] = React.useState<Date>(() => new Date());
  const [memoMap, setMemoMap] = React.useState<MonthMemoMap>({});
  const [loading, setLoading] = React.useState(false);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string>(() =>
    formatDate(new Date()),
  );

  const monthStr = React.useMemo(() => formatMonth(cursorMonth), [cursorMonth]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar-memo?month=${encodeURIComponent(monthStr)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setMemoMap(json?.data ?? {});
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const monthStart = React.useMemo(() => startOfMonth(cursorMonth), [cursorMonth]);
  const monthEnd = React.useMemo(() => endOfMonth(cursorMonth), [cursorMonth]);

  // 그리드 시작(일요일) ~ 끝(토요일)
  const gridStart = React.useMemo(() => addDays(monthStart, -monthStart.getDay()), [monthStart]);
  const gridEnd = React.useMemo(() => addDays(monthEnd, 6 - monthEnd.getDay()), [monthEnd]);

  const days: Date[] = React.useMemo(() => {
    const arr: Date[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      arr.push(cur);
      cur = addDays(cur, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const today = React.useMemo(() => new Date(), []);

  const openEditor = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSheetOpen(true);
  };

  const onPrevMonth = () => {
    const d = new Date(cursorMonth);
    d.setMonth(d.getMonth() - 1);
    setCursorMonth(d);
  };

  const onNextMonth = () => {
    const d = new Date(cursorMonth);
    d.setMonth(d.getMonth() + 1);
    setCursorMonth(d);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevMonth}>
            ◀
          </Button>
          <div className="text-base font-semibold text-fg/90">
            {cursorMonth.getFullYear()}년 {cursorMonth.getMonth() + 1}월
          </div>
          <Button variant="outline" size="sm" onClick={onNextMonth}>
            ▶
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">{loading ? "불러오는 중…" : ""}</div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dateStr = formatDate(d);
          const inMonth = d.getMonth() === cursorMonth.getMonth();
          const memos = memoMap[dateStr] ?? [];
          const isToday = isSameDay(d, today);

          const content =
            memos.length === 0 ? null : memos.length === 1 ? (
              <div className="mt-2 flex items-start gap-2 text-[11px] leading-4 text-fg/80">
                <Dot meetingType={memos[0].meeting_type} />
                <div className="min-w-0 truncate">
                  {memos[0].assignee} - {memos[0].gym_name} ({memos[0].max_people})
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {memos.slice(0, 2).map((m, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] leading-4 text-fg/80">
                    <Dot meetingType={m.meeting_type} />
                    <div className="min-w-0 truncate">{m.assignee}</div>
                  </div>
                ))}
              </div>
            );

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => openEditor(dateStr)}
              className={[
                "group rounded-2xl border p-3 text-left",
                "min-h-[92px]",
                "transition",
                "bg-white/5 backdrop-blur",
                "border-white/10",
                "hover:bg-white/8 hover:border-white/15",
                "active:scale-[0.995]",
                inMonth ? "" : "opacity-55",
                isToday ? "ring-1 ring-brand/60 border-brand/40" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-fg/90">{d.getDate()}</div>
                {memos.length > 0 ? (
                  <div className="text-[10px] text-fg/50">{memos.length}/2</div>
                ) : (
                  <div className="text-[10px] text-fg/30 opacity-0 transition group-hover:opacity-100">
                    메모
                  </div>
                )}
              </div>

              {content}
            </button>
          );
        })}
      </div>

      {/* Bottom Sheet */}
      <CalendarMemoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        memos={memoMap[selectedDate] ?? []}
        onChanged={async () => {
          await refresh();
        }}
      />
    </div>
  );
}
