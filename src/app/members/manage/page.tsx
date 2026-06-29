"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  TargetMemberPicker,
  type PickMember,
  type PickMemberRole,
} from "@/components/members/manage/TargetMemberPicker";
import {
  RoleStatusActionForm,
  type RoleStatusAction,
} from "@/components/members/manage/RoleStatusActionForm";
import {
  ProfileEditForm,
  type ProfileEditAction,
} from "@/components/members/manage/ProfileEditForm";
import { ApplyConfirmModal } from "@/components/members/manage/ApplyConfirmModal";

type CurrentProfile = {
  member_id: string;
  phone_number?: string;
  region?: string;
  level?: string;
};

type ManageMode = "ROLE_STATUS" | "PROFILE_EDIT";

const PROFILE_ACTION_LABEL: Record<ProfileEditAction, string> = {
  UPDATE_PHONE: "연락처 변경",
  UPDATE_REGION: "지역 변경",
  UPDATE_LEVEL: "레벨 변경",
};

const ROLE_ACTION_LABEL: Record<RoleStatusAction, string> = {
  PROMOTE_TO_STAFF: "운영진 등록",
  DEMOTE_FROM_STAFF: "운영진 해제",
  SET_ASSOCIATE: "준회원 등록",
  UNSET_ASSOCIATE_TO_REGULAR: "준회원 해제",
  SET_OB: "OB 전환",
  UNSET_OB_TO_REGULAR: "OB 해제(정회원 전환)",
  SET_DORMANT: "휴면 처리",
  UNSET_DORMANT_TO_REGULAR: "휴면 해제",
  SET_WITHDRAWN: "탈퇴 처리",
};

export default function MembersManagePage() {
  const router = useRouter();

  const [mode, setMode] = useState<ManageMode>("ROLE_STATUS");
  const [selectedMembers, setSelectedMembers] = useState<PickMember[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ROLE_STATUS
  const [roleAction, setRoleAction] = useState<RoleStatusAction | null>(null);

  // PROFILE_EDIT
  const [profileAction, setProfileAction] =
    useState<ProfileEditAction>("UPDATE_PHONE");
  const [afterValue, setAfterValue] = useState("");
  const [beforeValue, setBeforeValue] = useState(""); // ProfileEditForm이 채워줌
  const [canApplyProfileEdit, setCanApplyProfileEdit] = useState(true);

  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(
    null
  );
  const [profileLoading, setProfileLoading] = useState(false);

  // ✅ 성공 토스트
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const selectedRoles = useMemo(
    () => selectedMembers.map((m) => m.role) as PickMemberRole[],
    [selectedMembers]
  );

  const targets = useMemo(
    () =>
      selectedMembers.map((m) => ({
        member_id: m.member_id,
        name: m.name,
      })),
    [selectedMembers]
  );

  const actionLabel = useMemo(() => {
    if (mode === "PROFILE_EDIT") return PROFILE_ACTION_LABEL[profileAction];
    if (!roleAction) return "";
    return ROLE_ACTION_LABEL[roleAction];
  }, [mode, profileAction, roleAction]);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  const onChangeMode = (next: ManageMode) => {
    setMode(next);
    setSelectedMembers([]);
    setConfirmOpen(false);

    setRoleAction(null);

    setProfileAction("UPDATE_PHONE");
    setAfterValue("");
    setBeforeValue("");
    setCurrentProfile(null);
    setProfileLoading(false);
  };

  // ✅ PROFILE_EDIT: 1명 선택되면 기존값 로드
  useEffect(() => {
    const shouldLoad = mode === "PROFILE_EDIT" && selectedMembers.length === 1;
    if (!shouldLoad) {
      setCurrentProfile(null);
      setProfileLoading(false);
      return;
    }

    const memberId = selectedMembers[0].member_id;
    let alive = true;

    (async () => {
      try {
        setProfileLoading(true);

        // ⚠️ 프로젝트에 맞는 상세조회 API가 이미 있다면 그 엔드포인트 유지
        const res = await fetch(
          `/api/members/detail?member_id=${encodeURIComponent(memberId)}`
        );
        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setCurrentProfile(null);
          return;
        }
        setCurrentProfile(data.member as CurrentProfile);
      } finally {
        if (alive) setProfileLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode, selectedMembers]);

  const canOpenConfirm = useMemo(() => {
    if (selectedMembers.length === 0) return false;

    if (mode === "ROLE_STATUS") {
      return !!roleAction;
    }

    // PROFILE_EDIT
    return selectedMembers.length === 1 && !profileLoading && canApplyProfileEdit;
  }, [mode, selectedMembers.length, roleAction, profileLoading, canApplyProfileEdit]);

  return (
    <div className="mx-auto max-w-md px-4 pb-34">
      {/* ✅ Toast */}
      {toast && (
        <div className="fixed top-4 left-0 right-0 z-[60] flex justify-center px-4">
          <div className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white shadow">
            {toast}
          </div>
        </div>
      )}

      {/* 압축 헤더 + View Switcher */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">회원정보 관리</h2>
          <p className="text-xs text-muted-foreground">
            등급/상태 변경 및 개인정보 수정
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex shrink-0 rounded-md bg-muted p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onChangeMode("ROLE_STATUS")}
            className={`px-3 py-2 rounded transition whitespace-nowrap
              ${
                mode === "ROLE_STATUS"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            등급/상태
          </button>

          <button
            type="button"
            onClick={() => onChangeMode("PROFILE_EDIT")}
            className={`px-3 py-2 rounded transition whitespace-nowrap
              ${
                mode === "PROFILE_EDIT"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            개인정보
          </button>
        </div>
      </div>

      {/* Target Picker */}
      <div className="mt-6">
        <TargetMemberPicker
          key={mode}
          mode={mode}
          selectedMembers={selectedMembers}
          onChangeSelectedMembers={setSelectedMembers}
        />
      </div>

      {/* Action Form */}
      <div className="mt-6">
        {mode === "ROLE_STATUS" && (
          <RoleStatusActionForm
            selectedRoles={selectedRoles}
            value={roleAction}
            onChange={setRoleAction}
          />
        )}

        {mode === "PROFILE_EDIT" && (
          <ProfileEditForm
            selectedCount={selectedMembers.length}
            currentProfile={currentProfile}
            onValidityChange={setCanApplyProfileEdit}
            action={profileAction}
            onChangeAction={setProfileAction}
            afterValue={afterValue}
            onAfterValue={setAfterValue}
            onBeforeValue={setBeforeValue}
          />
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-zinc-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canOpenConfirm}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          변경사항 반영
        </button>
      </div>

      {/* Confirm Modal */}
      <ApplyConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        mode={mode}
        targets={targets}
        actionLabel={actionLabel}
        action={mode === "PROFILE_EDIT" ? profileAction : (roleAction as any)}
        beforeValue={mode === "PROFILE_EDIT" ? beforeValue : undefined}
        afterValue={mode === "PROFILE_EDIT" ? afterValue : undefined}
        onApplied={() => {
          showToast("변경이 반영되었습니다.");
          setSelectedMembers([]);
          setRoleAction(null);
          setAfterValue("");
          setBeforeValue("");
        }}
      />
    </div>
  );
}
