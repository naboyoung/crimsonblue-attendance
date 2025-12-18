"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { CalendarMemoRow } from "@/lib/types/calendarMemo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  memos: CalendarMemoRow[];
  onChanged: () => Promise<void> | void;
};

type Draft = {
  meeting_type: string;
  assignee: string;
  gym_name: string;
  max_people: string;
};

const MEETING_TYPES = [
  { value: "regular", label: "정기" },
  { value: "rental", label: "대관" },
  { value: "etc", label: "기타" },
] as const;

function emptyDraft(): Draft {
  return { meeting_type: "regular", assignee: "", gym_name: "", max_people: "" };
}

// ✅ 바텀시트 반투명일 때도 입력이 잘 보이도록(로컬에서만 적용)
const INPUT_CLASS = "bg-black/70 border-white/15 placeholder:text-fg/40";

export function CalendarMemoSheet({ open, onOpenChange, date, memos, onChanged }: Props) {
  const [creating, setCreating] = React.useState<Draft>(() => emptyDraft());
  const [saving, setSaving] = React.useState(false);

  const [edits, setEdits] = React.useState<Record<string, Draft>>({});

  React.useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const m of memos) {
      next[m.memo_id] = {
        meeting_type: m.meeting_type || "regular",
        assignee: m.assignee || "",
        gym_name: m.gym_name || "",
        max_people: m.max_people || "",
      };
    }
    setEdits(next);
    setCreating(emptyDraft());
  }, [date, memos]);

  async function createMemo() {
    // ✅ 담당자 필수(클라이언트에서 선제 차단)
    if (!creating.assignee.trim()) {
      alert("담당자는 필수야.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/calendar-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ...creating,
          max_people: creating.max_people,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("POST /api/calendar-memo failed:", res.status, text);
        alert(`추가 실패 (${res.status})\n${text}`);
        return;
      }

      setCreating(emptyDraft());
      await onChanged();
    } catch (e) {
      console.error(e);
      alert("추가 중 오류가 발생했어요. 콘솔 로그를 확인해줘.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMemo(memo_id: string) {
    const draft = edits[memo_id];
    if (!draft) return;

    // ✅ 수정 시에도 담당자 비우는 것 방지(서버에서도 막지만 UX 개선)
    if (!draft.assignee.trim()) {
      alert("담당자는 필수야.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/calendar-memo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo_id,
          ...draft,
          max_people: draft.max_people,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("PUT /api/calendar-memo failed:", res.status, text);
        alert(`저장 실패 (${res.status})\n${text}`);
        return;
      }

      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removeMemo(memo_id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/calendar-memo?memo_id=${encodeURIComponent(memo_id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("DELETE /api/calendar-memo failed:", res.status, text);
        alert(`삭제 실패 (${res.status})\n${text}`);
        return;
      }

      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-white/10">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">일정 메모</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {date} · 셀에는 최대 2개만 표시되고, 전체는 여기서 관리해요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* ✅ 새 일정 추가 */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">새 일정 추가</div>
              <Button variant="primary" size="sm" disabled={saving} onClick={createMemo}>
                추가
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={creating.meeting_type}
                  onValueChange={(v) => setCreating((p) => ({ ...p, meeting_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="모임유형" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  className={INPUT_CLASS}
                  placeholder="최대 인원"
                  inputMode="numeric"
                  value={creating.max_people}
                  onChange={(e) => setCreating((p) => ({ ...p, max_people: e.target.value }))}
                />
              </div>

              <Input
                className={INPUT_CLASS}
                placeholder="담당자 (필수)"
                value={creating.assignee}
                onChange={(e) => setCreating((p) => ({ ...p, assignee: e.target.value }))}
              />
              <Input
                className={INPUT_CLASS}
                placeholder="암장명"
                value={creating.gym_name}
                onChange={(e) => setCreating((p) => ({ ...p, gym_name: e.target.value }))}
              />
            </div>
          </div>

          {/* ✅ 일정 목록 전체 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">전체 일정 ({memos.length})</div>
            </div>

            {memos.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                등록된 일정이 없어요.
              </div>
            ) : (
              <div className="space-y-3">
                {memos.map((m) => {
                  const d = edits[m.memo_id] || emptyDraft();
                  return (
                    <div key={m.memo_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">업데이트: {m.updated_at || "-"}</div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => updateMemo(m.memo_id)}
                          >
                            저장
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={saving}
                            onClick={() => removeMemo(m.memo_id)}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={d.meeting_type}
                            onValueChange={(v) =>
                              setEdits((p) => ({ ...p, [m.memo_id]: { ...d, meeting_type: v } }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="모임유형" />
                            </SelectTrigger>
                            <SelectContent>
                              {MEETING_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            className={INPUT_CLASS}
                            placeholder="최대 인원"
                            inputMode="numeric"
                            value={d.max_people}
                            onChange={(e) =>
                              setEdits((p) => ({
                                ...p,
                                [m.memo_id]: { ...d, max_people: e.target.value },
                              }))
                            }
                          />
                        </div>

                        <Input
                          className={INPUT_CLASS}
                          placeholder="담당자 (필수)"
                          value={d.assignee}
                          onChange={(e) =>
                            setEdits((p) => ({
                              ...p,
                              [m.memo_id]: { ...d, assignee: e.target.value },
                            }))
                          }
                        />
                        <Input
                          className={INPUT_CLASS}
                          placeholder="암장명"
                          value={d.gym_name}
                          onChange={(e) =>
                            setEdits((p) => ({
                              ...p,
                              [m.memo_id]: { ...d, gym_name: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
