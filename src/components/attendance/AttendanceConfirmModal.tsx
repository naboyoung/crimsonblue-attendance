'use client';

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-md bg-white p-4 space-y-4">
        <h2 className="text-lg font-bold">출석 등록 확인</h2>

        <div className="space-y-1 text-sm">
          <p><b>날짜:</b> {payload.date}</p>
          <p><b>회차:</b> {payload.sessionId}</p>
          <p><b>모임 유형:</b> {payload.meetingType}</p>
          <p><b>암장:</b> {payload.gymName}</p>
          <p><b>작성자:</b> {payload.writer}</p>
          {payload.description && (
            <p><b>메모:</b> {payload.description}</p>
          )}
        </div>

        <div className="border rounded-md max-h-48 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-2 py-1 text-left">이름</th>
                <th className="px-2 py-1 text-left">유형</th>
                <th className="px-2 py-1 text-left">형태</th>
              </tr>
            </thead>
            <tbody>
              {payload.attendees.map((a, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">{a.name}</td>
                  <td className="px-2 py-1">{a.preregistered}</td>
                  <td className="px-2 py-1">{a.attendanceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? '저장 중...' : '최종 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
