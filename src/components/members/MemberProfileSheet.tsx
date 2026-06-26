"use client";

import { useEffect } from "react";
import type { Member } from "./MemberCard";

function lineItem(label: string, value?: string) {
  const v = (value ?? "").trim();
  return (
    <span className="text-sm text-zinc-700">
      <span className="text-zinc-500">{label}</span> {v || "-"}
    </span>
  );
}

function toDateOnly(value?: string) {
  const v = (value ?? "").trim();
  if (!v) return "";
  // "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DD"
  return v.split(" ")[0];
}

export function MemberProfileSheet(props: {
  open: boolean;
  member: Member | null;
  onClose: () => void;
}) {
  const { open, member, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !member) return null;

  const gender = (member.gender ?? "").trim();
  const birthYear = (member.birth_year ?? "").trim();
  const region = (member.region ?? "").trim();
  const dormancyCount = (member.dormancy_count ?? "").trim();

  const joinDate = (member.join_date ?? "").trim();
  const lastUpdated = toDateOnly(member.last_updated_at);
  const comment = (member.comment ?? "").trim();

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />

      {/* sheet */}
      <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-20 shadow-2xl">
        {/* grip */}
        <div className="flex items-center justify-center">
          <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
        </div>

        <div className="mt-4">
          <div className="text-lg font-semibold text-zinc-900">
            {(member.name ?? "").trim() || "(이름 없음)"}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            {(member.phone_number ?? "").trim() || "연락처없음"}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {lineItem("성별:", gender)}
            {lineItem("출생연도:", birthYear)}
            {lineItem("지역:", region)}
            {lineItem("휴면횟수:", dormancyCount)}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {lineItem("가입연월:", joinDate)}
            <span /> {/* 가운데 칸 비워두기(정렬용) */}
            {lineItem("최근 업데이트:", lastUpdated)}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <div className="mb-1 text-xs text-zinc-500">비고</div>
            <div className="whitespace-pre-wrap">{comment || "-"}</div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
