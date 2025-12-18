'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CalendarMemoRow = {
  date: string;
  slot: '1' | '2';
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string;
  updated_at: string;
  is_deleted: string;
};

type Slot = 1 | 2;

type EditorState = {
  slot: Slot;
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string; // input용
};

const MEETING_TYPES: Array<{ value: string; label: string }> = [
  // 프로젝트 실제 모임유형으로 교체해도 됨
  { value: 'regular', label: '정모' },
  { value: 'rental', label: '대관' },
  { value: 'etc', label: '기타' },
];

function slotOf(row: CalendarMemoRow): Slot {
  return row.slot === '2' ? 2 : 1;
}

function makeEmpty(date: string, slot: Slot): EditorState {
  return {
    slot,
    meeting_type: 'regular',
    assignee: '',
    gym_name: '',
    max_people: '',
  };
}

export function CalendarMemoSheet({
  open,
  onOpenChange,
  date,
  memos,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string; // YYYY-MM-DD
  memos: CalendarMemoRow[];
  onChanged: () => Promise<void> | void;
}) {
  const initialStates = React.useMemo(() => {
    const bySlot = new Map<Slot, CalendarMemoRow>();
    for (const m of memos) bySlot.set(slotOf(m), m);

    const s1 = bySlot.get(1)
      ? ({
          slot: 1,
          meeting_type: bySlot.get(1)!.meeting_type ?? 'regular',
          assignee: bySlot.get(1)!.assignee ?? '',
          gym_name: bySlot.get(1)!.gym_name ?? '',
          max_people: bySlot.get(1)!.max_people ?? '',
        } satisfies EditorState)
      : makeEmpty(date, 1);

    const s2 = bySlot.get(2)
      ? ({
          slot: 2,
          meeting_type: bySlot.get(2)!.meeting_type ?? 'regular',
          assignee: bySlot.get(2)!.assignee ?? '',
          gym_name: bySlot.get(2)!.gym_name ?? '',
          max_people: bySlot.get(2)!.max_people ?? '',
        } satisfies EditorState)
      : makeEmpty(date, 2);

    // 실제로 존재하는 슬롯만 먼저 보여주고, 필요할 때 2번째 추가
    const existingSlots = new Set(memos.map((m) => slotOf(m)));
    const list: EditorState[] = [];
    if (existingSlots.has(1)) list.push(s1);
    if (existingSlots.has(2)) list.push(s2);
    if (!existingSlots.has(1) && !existingSlots.has(2)) list.push(s1); // 0개면 slot1 하나만
    return { s1, s2, list, existingSlots };
  }, [date, memos]);

  const [items, setItems] = React.useState<EditorState[]>(initialStates.list);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setItems(initialStates.list);
  }, [initialStates.list]);

  const canAddSecond = items.length < 2;

  const addSecond = () => {
    if (!canAddSecond) return;
    // 현재 slot1만 있을 때 slot2 추가, slot2만 있을 때 slot1 추가
    const has1 = items.some((x) => x.slot === 1);
    const next = has1 ? initialStates.s2 : initialStates.s1;
    setItems((prev) => [...prev, next].sort((a, b) => a.slot - b.slot));
  };

  const saveOne = async (it: EditorState) => {
    setBusy(true);
    try {
      await fetch('/api/calendar-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          slot: it.slot,
          meeting_type: it.meeting_type,
          assignee: it.assignee,
          gym_name: it.gym_name,
          max_people: it.max_people,
        }),
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const removeOne = async (slot: Slot) => {
    setBusy(true);
    try {
      await fetch(`/api/calendar-memo?date=${encodeURIComponent(date)}&slot=${slot}`, {
        method: 'DELETE',
      });
      await onChanged();

      // UI에서도 해당 슬롯 제거 (0개가 되면 slot1 빈 카드 하나는 유지)
      setItems((prev) => {
        const next = prev.filter((x) => x.slot !== slot);
        return next.length === 0 ? [makeEmpty(date, 1)] : next;
      });
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (slot: Slot, patch: Partial<EditorState>) => {
    setItems((prev) =>
      prev.map((x) => (x.slot === slot ? { ...x, ...patch } : x)),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>일정 메모</SheetTitle>
          <SheetDescription>{date}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {items
            .slice()
            .sort((a, b) => a.slot - b.slot)
            .map((it) => (
              <div key={it.slot} className="rounded-2xl border p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">일정 {it.slot}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void saveOne(it)}
                    >
                      저장
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void removeOne(it.slot)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <div className="text-xs text-muted-foreground">모임유형</div>
                    <Select
                      value={it.meeting_type}
                      onValueChange={(v) => updateItem(it.slot, { meeting_type: v })}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="모임유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs text-muted-foreground">담당자</div>
                    <Input
                      value={it.assignee}
                      onChange={(e) => updateItem(it.slot, { assignee: e.target.value })}
                      placeholder="예: 보영"
                      disabled={busy}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs text-muted-foreground">암장명</div>
                    <Input
                      value={it.gym_name}
                      onChange={(e) => updateItem(it.slot, { gym_name: e.target.value })}
                      placeholder="예: 크림슨블루 홍대"
                      disabled={busy}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="text-xs text-muted-foreground">최대 인원수</div>
                    <Input
                      value={it.max_people}
                      onChange={(e) => updateItem(it.slot, { max_people: e.target.value })}
                      placeholder="예: 20"
                      inputMode="numeric"
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>
            ))}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              하루 최대 2개까지 등록 가능
            </div>
            <Button variant="secondary" disabled={!canAddSecond || busy} onClick={addSecond}>
              일정 추가
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
