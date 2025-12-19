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

function typeLabel(v: string) {
  return MEETING_TYPES.find((t) => t.value === v)?.label ?? v ?? "";
}

function emptyDraft(): Draft {
  return { meeting_type: "regular", assignee: "", gym_name: "", max_people: "" };
}

export function CalendarMemoSheet({ open, onOpenChange, date, memos, onChanged }: Props) {
  const [saving, setSaving] = React.useState(false);

  // ✅ 추가 폼 토글
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState<Draft>(() => emptyDraft());

  // ✅ memo_id별 draft (수정용)
  const [edits, setEdits] = React.useState<Record<string, Draft>>({});

  // ✅ 현재 편집 중인 카드
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // ✅ ⋯ 메뉴 열림 상태
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  // 바깥 클릭하면 메뉴 닫기
  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // 메뉴/버튼 영역 안을 클릭한 게 아니면 닫기
      const inMenuArea = el.closest('[data-menu-area="true"]');
      if (!inMenuArea) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // 날짜/목록 바뀔 때 상태 초기화
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
    setEditingId(null);
    setOpenMenuId(null);

    // 날짜 바뀌면 추가 폼은 닫고 초기화
    setCreateOpen(false);
    setCreating(emptyDraft());
  }, [date, memos]);

  const canCreate = creating.assignee.trim().length > 0;

  async function createMemo() {
    if (!canCreate) {
      alert("담당자는 필수입니다.");
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
      setCreateOpen(false);
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

    // 수정에서도 담당자 비면 막기(원하면 이 부분 제거 가능)
    if (draft.assignee.trim().length === 0) {
      alert("담당자는 필수입니다.");
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

      // 삭제하면 편집/메뉴 닫기
      if (editingId === memo_id) setEditingId(null);
      if (openMenuId === memo_id) setOpenMenuId(null);

      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(memo_id: string) {
    setEditingId(memo_id);
    setOpenMenuId(null);
  }

  function cancelEdit(memo_id: string) {
    const m = memos.find((x) => x.memo_id === memo_id);
    if (!m) {
      setEditingId(null);
      return;
    }

    // 원래 값으로 롤백
    setEdits((p) => ({
      ...p,
      [memo_id]: {
        meeting_type: m.meeting_type || "regular",
        assignee: m.assignee || "",
        gym_name: m.gym_name || "",
        max_people: m.max_people || "",
      },
    }));
    setEditingId(null);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={[
          "rounded-t-3xl",
          "bg-white text-black", // ✅ 시트 본체 불투명 흰색
          "border border-black/10",
          "px-4 pb-6 pt-4"
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-semibold text-black">일정 메모</SheetTitle>
            <SheetDescription className="text-sm text-black/60">
              {date} · 목록에서 관리하고, 우측 상단 +로 추가해요.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-1 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setCreateOpen((v) => !v)}
            >
              + 일정 추가
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* ✅ 추가 폼 (2줄 컴팩트) */}
          {createOpen && (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold text-black">새 일정</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setCreateOpen(false);
                      setCreating(emptyDraft());
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving || !canCreate}
                    onClick={createMemo}
                    title={!canCreate ? "담당자는 필수입니다" : undefined}
                  >
                    추가
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1줄: 모임유형 + 담당자(필수) */}
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
                    placeholder="담당자 *"
                    value={creating.assignee}
                    onChange={(e) => setCreating((p) => ({ ...p, assignee: e.target.value }))}
                  />
                </div>

                {/* 2줄: 암장명 + 최대인원(선택) */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="암장명 (선택)"
                    value={creating.gym_name}
                    onChange={(e) => setCreating((p) => ({ ...p, gym_name: e.target.value }))}
                  />
                  <Input
                    placeholder="최대 인원 (선택)"
                    inputMode="numeric"
                    value={creating.max_people}
                    onChange={(e) => setCreating((p) => ({ ...p, max_people: e.target.value }))}
                  />
                </div>

                {!canCreate && (
                  <div className="text-xs text-black/50">담당자는 필수입니다.</div>
                )}
              </div>
            </div>
          )}

          {/* ✅ 일정 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-black">전체 일정 ({memos.length})</div>
            </div>

            {memos.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-sm text-black/60">
                등록된 일정이 없어요.
              </div>
            ) : (
              <div className="space-y-3">
                {memos.map((m) => {
                  const d = edits[m.memo_id] || emptyDraft();
                  const isEditing = editingId === m.memo_id;
                  const menuOpen = openMenuId === m.memo_id;

                  return (
                    <div
                      key={m.memo_id}
                      className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
                    >
                      {/* 상단 바: updated + ⋯ */}
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="text-xs text-black/50">
                          업데이트: {m.updated_at || "-"}
                        </div>

                        <div className="relative" data-menu-area="true">
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-black/60 hover:bg-black/5 hover:text-black"
                            aria-label="메뉴"
                            onClick={() => setOpenMenuId((cur) => (cur === m.memo_id ? null : m.memo_id))}
                          >
                            ⋯
                          </button>

                          {menuOpen && (
                            <div className="absolute right-0 top-8 z-50 w-28 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-black/5"
                                onClick={() => startEdit(m.memo_id)}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => removeMemo(m.memo_id)}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 본문 */}
                      {!isEditing ? (
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-black">
                            {typeLabel(m.meeting_type)} · {m.assignee || "(담당자 없음)"}
                          </div>
                          <div className="text-sm text-black/70">
                            {(m.gym_name || "암장 미정") +
                              (m.max_people ? ` · (${m.max_people})` : "")}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* 편집 폼: 2줄 */}
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
                              placeholder="담당자 *"
                              value={d.assignee}
                              onChange={(e) =>
                                setEdits((p) => ({ ...p, [m.memo_id]: { ...d, assignee: e.target.value } }))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="암장명 (선택)"
                              value={d.gym_name}
                              onChange={(e) =>
                                setEdits((p) => ({ ...p, [m.memo_id]: { ...d, gym_name: e.target.value } }))
                              }
                            />
                            <Input
                              placeholder="최대 인원 (선택)"
                              inputMode="numeric"
                              value={d.max_people}
                              onChange={(e) =>
                                setEdits((p) => ({ ...p, [m.memo_id]: { ...d, max_people: e.target.value } }))
                              }
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={saving}
                              onClick={() => cancelEdit(m.memo_id)}
                            >
                              취소
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={saving || d.assignee.trim().length === 0}
                              onClick={() => updateMemo(m.memo_id)}
                              title={d.assignee.trim().length === 0 ? "담당자는 필수입니다" : undefined}
                            >
                              저장
                            </Button>
                          </div>
                        </div>
                      )}
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
