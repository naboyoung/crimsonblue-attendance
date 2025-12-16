// src/components/members/MemberListPanel.tsx
"use client";

import type { Member } from "./MemberCard";
import { MemberCard } from "./MemberCard";

type ViewState = "idle" | "loading" | "empty" | "results" | "error";

export function MemberListPanel(props: {
  state: ViewState;
  members: Member[];
  onClickMember: (m: Member) => void;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const { state, members, onClickMember, errorMessage, onRetry } = props;

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {/* 높이 제한 + 내부 스크롤 */}
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {state === "idle" && (
          <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            이름을 검색하면 회원이 표시돼요.
          </div>
        )}

        {state === "loading" && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-zinc-200 bg-zinc-50 animate-pulse dark:border-zinc-800 dark:bg-zinc-900/30"
              />
            ))}
          </div>
        )}

        {state === "empty" && (
          <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            검색 결과가 없어요.
          </div>
        )}

        {state === "error" && (
          <div className="py-8 text-center">
            <div className="text-sm text-red-600 dark:text-red-400">
              {errorMessage || "오류가 발생했어요."}
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/30"
              >
                다시 시도
              </button>
            )}
          </div>
        )}

        {state === "results" && (
          <div className="space-y-3 py-2">
            {members.map((m, idx) => (
              <MemberCard
                key={`${m.member_id ?? m.name ?? "member"}-${idx}`}
                member={m}
                onClick={() => onClickMember(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
