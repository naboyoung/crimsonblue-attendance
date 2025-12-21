"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CalendarMemoSheet } from "@/components/home/CalendarMemoSheet";
import type { MonthMemoMap } from "@/lib/types/calendarMemo";

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

function isSunday(d: Date) {
  return d.getDay() === 0;
}

function isSaturday(d: Date) {
  return d.getDay() === 6;
}

/**
 * ✅ 모임유형 dot 컬러 매핑
 * - 프로젝트에서 이미 쓰는 색이 있으면 여기만 교체
 */
const MEETING_TYPE_DOT_CLASS: Record<string, string> = {
  regular: "bg-blue-500",
  rental: "bg-red-500",
  etc: "bg-gray-400",
};

function Dot({ meetingType }: { meetingType: string }) {
  const cls = MEETING_TYPE_DOT_CLASS[meetingType] ?? "bg-gray-400";
  return (
    <span
      className={["mt-[2px] inline-block", "h-3 w-[3px] rounded-full", cls].join(
        " "
      )}
    />
  );
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
    formatDate(new Date())
  );

  // ✅ 롱프레스 타이머
  const pressTimerRef = React.useRef<number | null>(null);
  const pressedDateRef = React.useRef<string | null>(null);

  function clearPressTimer() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressedDateRef.current = null;
  }

  function startLongPress(dateStr: string) {
    clearPressTimer();
    pressedDateRef.current = dateStr;

    // 탭/터치 피드백으로 선택 강조는 즉시
    setSelectedDate(dateStr);

    pressTimerRef.current = window.setTimeout(() => {
      if (pressedDateRef.current === dateStr) {
        setSheetOpen(true);
      }
    }, 450);
  }

  function endLongPress() {
    clearPressTimer();
  }

  const monthStr = React.useMemo(() => formatMonth(cursorMonth), [cursorMonth]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar-memo?month=${encodeURIComponent(monthStr)}`,
        { cache: "no-store" }
      );
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
      <div className="mt-5 mb-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
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
          const isSelected = selectedDate === dateStr;

          const content =
            memos.length === 0 ? null : memos.length === 1 ? (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-start gap-1 text-[9px] leading-tight text-fg/90">
                  <Dot meetingType={memos[0].meeting_type} />
                  <div className="min-w-0 flex-1 whitespace-normal break-words font-semibold">
                    {memos[0].assignee}
                  </div>
                </div>

                <div className="pl-2 text-[9px] leading-tight text-fg/70 whitespace-normal break-words">
                  {memos[0].gym_name || ""}
                </div>
              </div>
            ) : (
              <div className="mt-1 space-y-0.5">
                {memos.slice(0, 2).map((m) => (
                  <div
                    key={m.memo_id}
                    className="flex items-start gap-1 text-[9px] leading-tight text-fg/90"
                  >
                    <Dot meetingType={m.meeting_type} />
                    <div className="min-w-0 flex-1 whitespace-normal break-words font-semibold">
                      {m.assignee}
                    </div>
                  </div>
                ))}

                {memos.length > 2 && (
                  <div className="text-[9px] leading-tight text-fg/50">
                    +{memos.length - 2}
                  </div>
                )}
              </div>
            );

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                startLongPress(dateStr);
              }}
              onPointerUp={endLongPress}
              onPointerCancel={endLongPress}
              onPointerLeave={endLongPress}
              className={[
                "group rounded-2xl border px-2 py-2 text-left",
                "min-h-[92px]",
                "transition",
                "bg-white/5 backdrop-blur",
                "border-white/10",
                "hover:bg-white/10 hover:border-white/20",
                "active:scale-[0.995]",
                inMonth ? "" : "opacity-55",
                isToday ? "border-brand/50 ring-1 ring-brand/40 bg-brand/5" : "",
                isSelected ? "bg-white/10 border-white/25" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between h-[20px]">
                <div
                  className={[
                    "text-sm font-semibold leading-none text-fg/90",
                    isToday
                      ? "text-brand"
                      : isSunday(d)
                      ? "text-red-500"
                      : isSaturday(d)
                      ? "text-red-500"
                      : "text-fg/90",
                  ].join(" ")}
                >
                  {d.getDate()}
                </div>

                <div className="w-4 text-right text-[10px] text-fg/50">
                  {memos.length > 0 ? memos.length : ""}
                </div>
              </div>

              {memos.length === 0 ? (
                <div className="mt-1 text-[10px] text-fg/35 opacity-0 transition group-hover:opacity-100">
                  메모
                </div>
              ) : null}

              {content}
            </button>
          );
        })}
      </div>

      {/* ✅ Loading (캘린더 아래로 이동 + 자리 고정) */}
      <div className="mt-2 min-h-[16px] text-center text-xs text-muted-foreground">
        {loading ? "불러오는 중…" : ""}
      </div>

      {/* Bottom Sheet */}
      <CalendarMemoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        memos={memoMap[selectedDate] ?? []}
        onDeleted={(memoId) => {
          setMemoMap((prev) => {
            const list = prev[selectedDate] ?? [];
            const nextList = list.filter((m) => m.memo_id !== memoId);

            if (nextList.length === 0) {
              const { [selectedDate]: _removed, ...rest } = prev;
              return rest;
            }

            return { ...prev, [selectedDate]: nextList };
          });
        }}
        onChanged={async () => {
          await refresh();
        }}
      />
    </div>
  );
}
