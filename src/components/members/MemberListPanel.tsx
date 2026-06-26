"use client";

import type { Member } from "./MemberCard";
import { MemberCard } from "./MemberCard";
import { Skeleton } from "@/components/ui/Skeleton";

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
    // ✅ page.tsx의 "단일 카드" 안에 들어가도록: 바깥 카드 래퍼 제거
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      {/* 높이 제한 + 내부 스크롤 */}
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {state === "idle" && (
          <div className="py-10 text-center text-sm text-zinc-500">
            이름을 검색하면 회원이 표시돼요.
          </div>
        )}

        {state === "loading" && (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="shrink-0 space-y-2">
                    <Skeleton className="ml-auto h-5 w-14" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {state === "empty" && (
          <div className="py-10 text-center text-sm text-zinc-500">
            검색 결과가 없어요.
          </div>
        )}

        {state === "error" && (
          <div className="py-8 text-center">
            <div className="text-sm text-red-600">
              {errorMessage || "오류가 발생했어요."}
            </div>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
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
