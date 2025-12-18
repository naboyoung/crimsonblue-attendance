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
  onChanged: () => Promise<void> | void; // 저장/삭제 후 월 리프레시
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

export function CalendarMemoSheet({ open, onOpenChange, date, memos, onChanged }: Props) {
  const [saving, setSaving] = React.useState(false);

  // ✅ 2안: 기본은 목록, 필요할 때만 폼 펼치기
  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState<Draft>(() => emptyDraft());

  // ✅ 인라인 수정: 동시에 1개만 편집
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // memo_id별 draft (수정값)
  const [edits, setEdits] = React.useState<Record<string, Draft>>({});

  const canCreate = creating.assignee.trim().length > 0;

  React.useEffect(() => {
    // 날짜/목록 바뀌면 편집 상태 초기화
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

    // 새로 열 때 UX: 목록 중심 유지
    setShowCreate(false);
    setCreating(emptyDraft());
    setEditingId(null);
  }, [date, memos]);

  async function createMemo() {
    if (!canCreate) {
      alert("담당자는 필수예요.");
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

      // ✅ 성공: 폼 접고 초기화 + 목록 리프레시
      setCreating(emptyDraft());
      setShowCreate(false);
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

    // (선택) 수정에서도 담당자 필수로 하고 싶다면 아래 주석 해제
    // if (!draft.assignee.trim()) {
    //   alert("담당자는 필수예요.");
    //   return;
    // }

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

      setEditingId(null);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removeMemo(memo_id: string) {
    const ok = confirm("이 일정을 삭제할까요?");
    if (!ok) return;

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

      if (editingId === memo_id) setEditingId(null);
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  function CardView({ m }: { m: CalendarMemoRow }) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg/90">
              {m.assignee || "(담당자 없음)"}{" "}
              <span className="text-fg/50 font-normal">
                · {m.meeting_type || "regular"}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-fg/70">
              {m.gym_name ? m.gym_name : <span className="text-fg/40">암장명 없음</span>}
              {m.max_people ? (
                <span className="text-fg/50"> · 최대 {m.max_people}</span>
              ) : null}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              업데이트: {m.updated_at || "-"}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setEditingId(m.memo_id)}
            >
              수정
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
      </div>
    );
  }

  function CardEdit({ m }: { m: CalendarMemoRow }) {
    const d = edits[m.memo_id] || emptyDraft();

    return (
      <div className="rounded-2xl border border-white/15 bg-white/7 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-fg/90">일정 수정</div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setEditingId(null)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={() => updateMemo(m.memo_id)}
            >
              저장
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
              placeholder="최대 인원"
              inputMode="numeric"
              value={d.max_people}
              onChange={(e) =>
                setEdits((p) => ({ ...p, [m.memo_id]: { ...d, max_people: e.target.value } }))
              }
            />
          </div>

          <Input
            placeholder="담당자"
            value={d.assignee}
            onChange={(e) =>
              setEdits((p) => ({ ...p, [m.memo_id]: { ...d, assignee: e.target.value } }))
            }
          />

          <Input
            placeholder="암장명"
            value={d.gym_name}
            onChange={(e) =>
              setEdits((p) => ({ ...p, [m.memo_id]: { ...d, gym_name: e.target.value } }))
            }
          />

          <div className="mt-1 flex justify-end">
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
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-white/10">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">일정 메모</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {date} · 목록에서 수정/삭제하고, 필요할 때만 추가 폼을 펼쳐요.
          </SheetDescription>
        </SheetHeader>

        {/* ✅ 상단 액션: + 일정 추가 토글 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            “+ 일정 추가”를 눌러 입력하세요.
          </div>

          <Button
            variant={showCreate ? "outline" : "primary"}
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            disabled={saving}
          >
            {showCreate ? "닫기" : "+ 일정 추가"}
          </Button>
        </div>

        {/* ✅ 추가 폼(토글) */}
        {showCreate ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">새 일정 추가</div>
              <Button
                variant="primary"
                size="sm"
                disabled={saving || !canCreate}
                onClick={createMemo}
              >
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
                  placeholder="최대 인원 (선택)"
                  inputMode="numeric"
                  value={creating.max_people}
                  onChange={(e) => setCreating((p) => ({ ...p, max_people: e.target.value }))}
                />
              </div>

              <Input
                placeholder="담당자 (필수)"
                value={creating.assignee}
                onChange={(e) => setCreating((p) => ({ ...p, assignee: e.target.value }))}
              />

              <Input
                placeholder="암장명 (선택)"
                value={creating.gym_name}
                onChange={(e) => setCreating((p) => ({ ...p, gym_name: e.target.value }))}
              />

              {!canCreate ? (
                <div className="text-[11px] text-fg/60">* 담당자는 필수예요.</div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ✅ 전체 목록(기본 화면) */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">전체 일정</div>
            <div className="text-xs text-fg/50">{memos.length}개</div>
          </div>

          {memos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
              등록된 일정이 없어요.
            </div>
          ) : (
            <div className="space-y-3">
              {memos.map((m) =>
                editingId === m.memo_id ? (
                  <CardEdit key={m.memo_id} m={m} />
                ) : (
                  <CardView key={m.memo_id} m={m} />
                ),
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
