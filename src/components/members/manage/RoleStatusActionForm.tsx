"use client";

import { useMemo } from "react";
import type { PickMemberRole } from "@/components/members/manage/TargetMemberPicker";

export type RoleStatusAction =
  | "PROMOTE_TO_STAFF"
  | "DEMOTE_FROM_STAFF"
  | "SET_DORMANT"
  | "UNSET_DORMANT_TO_REGULAR"
  | "SET_WITHDRAWN"
  | "SET_ASSOCIATE"
  | "UNSET_ASSOCIATE_TO_REGULAR";

type Props = {
  selectedRoles: PickMemberRole[];

  // ✅ 추가: 부모가 선택된 action을 관리
  value: RoleStatusAction | null;
  onChange: (next: RoleStatusAction | null) => void;
};

const ACTION_LABEL: Record<RoleStatusAction, string> = {
  PROMOTE_TO_STAFF: "운영진 등록",
  DEMOTE_FROM_STAFF: "운영진 해제",
  SET_ASSOCIATE: "준회원 등록",
  UNSET_ASSOCIATE_TO_REGULAR: "준회원 해제",
  SET_DORMANT: "휴면 처리",
  UNSET_DORMANT_TO_REGULAR: "휴면 해제",
  SET_WITHDRAWN: "탈퇴 처리",
};

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function allowedActionsByRoles(roles: PickMemberRole[]): RoleStatusAction[] {
  const rs = unique(roles);

  // ✅ 역할이 섞인 경우도 있으니 “가능한 액션 합집합” 형태로 제공
  const set = new Set<RoleStatusAction>();

  for (const r of rs) {
    if (r === "운영진") {
      set.add("DEMOTE_FROM_STAFF");
      set.add("SET_DORMANT");
      set.add("SET_WITHDRAWN");
      continue;
    }
    if (r === "정회원") {
      set.add("PROMOTE_TO_STAFF");
      set.add("SET_ASSOCIATE");
      set.add("SET_DORMANT");
      set.add("SET_WITHDRAWN");
      continue;
    }
    if (r === "준회원") {
      set.add("PROMOTE_TO_STAFF");
      set.add("UNSET_ASSOCIATE_TO_REGULAR");
      set.add("SET_DORMANT");
      set.add("SET_WITHDRAWN");
      continue;
    }
    if (r === "휴면") {
      set.add("UNSET_DORMANT_TO_REGULAR");
      set.add("SET_WITHDRAWN");
      continue;
    }
    if (r === "탈퇴") {
      // 탈퇴는 보통 복구 없음(필요하면 나중에 추가)
      continue;
    }
  }

  return Array.from(set);
}

export function RoleStatusActionForm({ selectedRoles, value, onChange }: Props) {
  const available = useMemo(() => allowedActionsByRoles(selectedRoles), [selectedRoles]);

  // 현재 value가 available에 없으면 자동 해제(필터 바뀌면 액션도 정합성 유지)
  const normalizedValue = value && available.includes(value) ? value : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-base font-semibold text-zinc-900">등급 / 상태 변경</div>
      <div className="mt-1 text-xs text-zinc-500">
        선택된 회원의 현재 등급/상태에 따라 가능한 작업만 표시됩니다.
      </div>

      <div className="mt-4 grid gap-2">
        {available.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            가능한 작업이 없습니다. (예: 탈퇴 회원)
          </div>
        ) : (
          available.map((a) => {
            const active = normalizedValue === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onChange(active ? null : a)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="font-semibold text-zinc-900">{ACTION_LABEL[a]}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
