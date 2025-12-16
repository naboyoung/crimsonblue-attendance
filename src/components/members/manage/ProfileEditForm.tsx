"use client";

import { useEffect, useMemo } from "react";

export type ProfileEditAction = "UPDATE_PHONE" | "UPDATE_REGION" | "UPDATE_LEVEL";

type CurrentProfile = {
  phone_number?: string;
  region?: string;
  level?: string;
};

const FIELDS: { key: ProfileEditAction; label: string; placeholder: string }[] = [
  { key: "UPDATE_PHONE", label: "연락처 변경", placeholder: "예: 010-1234-5678" },
  { key: "UPDATE_REGION", label: "지역 변경", placeholder: "예: 강남/잠실/신촌…" },
  { key: "UPDATE_LEVEL", label: "레벨 변경", placeholder: "예: 입문, 빨, 주, 노…" },
];

function getCurrentValue(profile: CurrentProfile | null, action: ProfileEditAction) {
  if (!profile) return "";
  if (action === "UPDATE_PHONE") return (profile.phone_number ?? "").trim();
  if (action === "UPDATE_REGION") return (profile.region ?? "").trim();
  return (profile.level ?? "").trim();
}

export function ProfileEditForm(props: {
  selectedCount: number;
  currentProfile: CurrentProfile | null;
  onValidityChange?: (canApply: boolean) => void;

  // ✅ 추가(부모로 상태 올리기)
  action: ProfileEditAction;
  onChangeAction: (next: ProfileEditAction) => void;
  afterValue: string;
  onAfterValue: (next: string) => void;

  // ✅ 모달 요약용(부모에 beforeValue도 채워주기)
  onBeforeValue?: (before: string) => void;
}) {
  const {
    selectedCount,
    currentProfile,
    onValidityChange,
    action,
    onChangeAction,
    afterValue,
    onAfterValue,
    onBeforeValue,
  } = props;

  const selectedField = useMemo(() => FIELDS.find((f) => f.key === action), [action]);
  const beforeValue = useMemo(() => getCurrentValue(currentProfile, action), [currentProfile, action]);
  const trimmedAfter = useMemo(() => afterValue.trim(), [afterValue]);

  const isSame = beforeValue !== "" && trimmedAfter !== "" && beforeValue === trimmedAfter;
  const canApply = selectedCount === 1 && trimmedAfter.length > 0 && !isSame && !!currentProfile;

  useEffect(() => {
    onValidityChange?.(canApply);
  }, [canApply, onValidityChange]);

  // ✅ beforeValue를 부모로 넘겨서 모달에 쓰게 함
  useEffect(() => {
    onBeforeValue?.(beforeValue);
  }, [beforeValue, onBeforeValue]);

  // 액션 바뀌면 입력값 초기화(혼동 방지)
  useEffect(() => {
    onAfterValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-base font-semibold text-zinc-900">개인정보 수정</div>
      <div className="mt-1 text-xs text-zinc-500">
        개인정보 수정은 1명만 가능합니다. (현재 선택: {selectedCount}명)
      </div>

      <div className="mt-4 grid gap-2">
        {FIELDS.map((f) => {
          const active = f.key === action;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onChangeAction(f.key)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <div className="font-semibold text-zinc-900">{f.label}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="text-xs text-zinc-500">기존 값</div>
        <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900">
          {selectedCount !== 1 ? "회원 1명을 선택하세요." : currentProfile ? (beforeValue || "(비어있음)") : "불러오는 중…"}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-zinc-500">새 값</div>
        <input
          value={afterValue}
          onChange={(e) => onAfterValue(e.target.value)}
          placeholder={selectedField?.placeholder ?? ""}
          disabled={selectedCount !== 1}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 disabled:bg-zinc-50"
        />
        {isSame && (
          <div className="mt-2 text-xs text-red-600">기존 값과 동일합니다. 다른 값을 입력해주세요.</div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs text-zinc-500">변경 미리보기</div>
        <div className="mt-1 text-sm text-zinc-900">
          {selectedField?.label} → {trimmedAfter || "(새 값을 입력하세요)"}
        </div>
      </div>
    </div>
  );
}
