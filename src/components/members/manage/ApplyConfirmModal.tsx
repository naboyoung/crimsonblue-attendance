"use client";

import { useMemo, useState } from "react";

export type ConfirmTarget = {
  member_id: string;
  name: string;
};

type Mode = "ROLE_STATUS" | "PROFILE_EDIT";

type RoleStatusAction =
  | "PROMOTE_TO_STAFF"
  | "DEMOTE_FROM_STAFF"
  | "SET_DORMANT"
  | "UNSET_DORMANT_TO_REGULAR"
  | "SET_WITHDRAWN"
  | "SET_ASSOCIATE"
  | "UNSET_ASSOCIATE_TO_REGULAR";

type ProfileEditAction = "UPDATE_PHONE" | "UPDATE_REGION" | "UPDATE_LEVEL";

export type ApplyConfirmModalProps = {
  open: boolean;
  onClose: () => void;

  mode: Mode;
  targets: ConfirmTarget[];

  actionLabel: string;
  action: RoleStatusAction | ProfileEditAction;

  beforeValue?: string;
  afterValue?: string;

  onApplied?: () => void;
};

export function ApplyConfirmModal(props: ApplyConfirmModalProps) {
  const {
    open,
    onClose,
    mode,
    targets,
    actionLabel,
    action,
    beforeValue,
    afterValue,
    onApplied,
  } = props;

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [changedBy, setChangedBy] = useState("");

  const firstName = targets[0]?.name ?? "";
  const restCount = Math.max(targets.length - 1, 0);

  const canConfirm = useMemo(() => {
    if (submitting) return false;
    if (!changedBy.trim()) return false;
    if (targets.length === 0) return false;

    if (mode === "PROFILE_EDIT") {
      return targets.length === 1 && !!afterValue?.trim();
    }
    return true;
  }, [submitting, changedBy, targets.length, mode, afterValue]);

  if (!open) return null;

  const onConfirm = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const memberIds = targets.map((t) => t.member_id);

      const body =
        mode === "ROLE_STATUS"
          ? {
              kind: "ROLE_STATUS",
              action,
              targetMemberIds: memberIds,
              changedBy: changedBy.trim(),
            }
          : {
              kind: "PROFILE_EDIT",
              action,
              targetMemberIds: memberIds,
              payload: { newValue: afterValue?.trim() },
              changedBy: changedBy.trim(),
            };

      const res = await fetch("/api/members/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), 
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? '요청 처리 실패 (${res.status})');
        
      }

      onApplied?.();
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 pb-16">
      <div className="w-full rounded-t-2xl bg-white p-5">
        {/* Header */}
        <div className="text-lg font-bold text-zinc-900">
          {mode === "PROFILE_EDIT" ? "회원정보 수정" : "등급 / 상태 변경"}
        </div>

        <div className="mt-1 text-sm text-zinc-600">
          상세 작업: <span className="font-medium text-zinc-900">{actionLabel}</span>
        </div>

        {/* Targets */}
        <div className="mt-4">
          <div className="text-xs text-zinc-500">대상 회원</div>
          <div className="mt-1 text-sm text-zinc-900">
            {mode === "ROLE_STATUS"
              ? `${firstName}${restCount > 0 ? ` 외 ${restCount}명` : ""}`
              : firstName}
          </div>
        </div>

        {/* Before / After */}
        {mode === "PROFILE_EDIT" && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <div className="text-zinc-500">이전 값</div>
            <div className="font-medium text-zinc-900">{beforeValue || "-"}</div>

            <div className="mt-2 text-zinc-500">변경 값</div>
            <div className="font-medium text-zinc-900">{afterValue}</div>
          </div>
        )}

        {/* ✅ 운영진 이름 입력 (버튼 위) */}
        <div className="mt-5">
          <div className="text-xs text-zinc-500">운영진 이름</div>
          <input
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
            placeholder="운영진 이름을 정확히 입력해주세요"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300"
          />
          <div className="mt-1 text-[11px] text-zinc-400">
            * 운영진 본인 확인을 위해 이름 입력이 필요합니다.
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-200 py-3 text-sm"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
          >
            {submitting ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
