"use client";

import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { meetingTypeToVariant } from "@/lib/ui/badgeVariants";

type AttendanceConfirmPayload = {
  date: string;
  sessionId: string;
  meetingType: string;
  gymName: string;
  writer: string;
  description?: string;
  attendees: {
    name: string;
    preregistered: string;
    attendanceType: string;
  }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  submitting: boolean;
  payload: AttendanceConfirmPayload;
};

export default function AttendanceConfirmModal({
  open,
  onClose,
  onConfirm,
  submitting,
  payload,
}: Props) {
  // ESC 닫기
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const memo = String(payload.description ?? "").trim();
  const hasMemo = memo.length > 0;

  // 참석자 요약
  const total = payload.attendees.length;
  const normal = payload.attendees.filter((a) => a.attendanceType === "정상").length;
  const late = payload.attendees.filter((a) => a.attendanceType === "지각").length;
  const absent = payload.attendees.filter((a) => a.attendanceType === "불참").length;

  const meetingTypeText = String(payload.meetingType ?? "").trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-16"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Bottom Sheet */}
      <div
        className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-slate-900">출석 등록 확인</div>
              <div className="text-sm text-slate-600">아래 내용으로 등록할까요?</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200" />

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {/* 요약 영역 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">날짜</div>
                <div className="text-sm font-semibold text-slate-900">{payload.date}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500">회차</div>
                <div className="text-sm font-semibold text-slate-900">{payload.sessionId}회</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meetingTypeToVariant(meetingTypeText)}>
                {meetingTypeText || "기타"}
              </Badge>
              <div className="text-sm text-slate-700">{payload.gymName}</div>
            </div>

            <div className="text-xs text-slate-500">작성자: {payload.writer}</div>

            {hasMemo && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">메모</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{memo}</div>
              </div>
            )}
          </div>

          <div className="my-4 border-t border-slate-200" />

          {/* 참석자 요약 + 목록 */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">참석자 {total}명</div>
            <div className="text-xs text-slate-600">
              정상 {normal} · 지각 {late} · 불참 {absent}
            </div>
          </div>

          {total === 0 ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              참석자가 없습니다. 닫고 참석자를 추가해주세요.
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="border-b border-slate-200">
                      <th className="sticky top-0 z-10 w-[40%] bg-slate-50 px-3 py-2 text-center text-xs font-semibold">
                        이름
                      </th>
                      <th className="sticky top-0 z-10 w-[30%] bg-slate-50 px-3 py-2 text-center text-xs font-semibold">
                        유형
                      </th>
                      <th className="sticky top-0 z-10 w-[30%] bg-slate-50 px-3 py-2 text-center text-xs font-semibold">
                        형태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {payload.attendees.map((a, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                        <td className="truncate px-3 py-2 text-center font-medium text-slate-900">
                          {a.name}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">{a.preregistered}</td>
                        <td className="px-3 py-2 text-center text-slate-700">{a.attendanceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting || total === 0}
              className={[
                "h-11 flex-1 rounded-xl text-sm font-semibold transition active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2",
                submitting || total === 0
                  ? "cursor-not-allowed bg-slate-200 text-slate-400"
                  : "bg-slate-900 text-white shadow-sm hover:opacity-90",
              ].join(" ")}
              title={total === 0 ? "참석자를 추가해주세요" : undefined}
            >
              {submitting ? "저장 중…" : "최종 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
