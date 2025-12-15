'use client';

import { useMemo, useState } from 'react';
import type { AttendeeRow, Preregistered, AttendanceType } from '@/types/attendance';

type Props = {
  attendeeInput: string;
  attendees: AttendeeRow[];
  onAttendeeInputChange: (v: string) => void;
  onAttendeesChange: (next: AttendeeRow[]) => void;
  memberOptions: string[];
};

export default function AttendanceAttendeeSection({
  attendeeInput,
  attendees,
  onAttendeeInputChange,
  onAttendeesChange,
  memberOptions,
}: Props) {
  const [preregistered, setPreregistered] = useState<Preregistered>('기존');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('정상');

  // ✅ 자동완성 후보: "포함" 기준
  const suggestions = useMemo(() => {
    const q = attendeeInput.trim();
    if (!q) return [];
    return memberOptions.filter((name) => name.includes(q)).slice(0, 8);
  }, [attendeeInput, memberOptions]);

  const addAttendee = () => {
    const name = attendeeInput.trim();
    if (!name) return;

    // ✅ 동일 이름 중복 방지
    const exists = attendees.some((a) => a.name === name);
    if (exists) {
      alert('이미 추가된 이름입니다.');
      return;
    }

    const next: AttendeeRow[] = [
      ...attendees,
      {
        id: Date.now(),
        name,
        preregistered,
        attendanceType,
      },
    ];

    onAttendeesChange(next);

    // ✅ 추가 후 입력 초기화
    onAttendeeInputChange('');
    setPreregistered('기존');
    setAttendanceType('정상');
  };

  // ✅ [추가] 행 단위 삭제
  const removeById = (id: number) => {
    onAttendeesChange(attendees.filter((a) => a.id !== id));
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="text-base font-semibold">출석자 등록</h2>

      {/* 입력 영역 */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm text-slate-600">출석자명</label>
          <input
            className="h-10 rounded-md border border-slate-200 px-3"
            value={attendeeInput}
            onChange={(e) => onAttendeeInputChange(e.target.value)}
            placeholder="이름 입력"
          />

          {/* ✅ 자동완성 리스트 (이름만) */}
          {attendeeInput.trim() && (
            <div className="rounded-md border border-slate-200 bg-white">
              {suggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">일치하는 회원이 없습니다.</div>
              ) : (
                suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => onAttendeeInputChange(name)}
                  >
                    {name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ✅ 참석유형/참석형태 (요구사항 순서 그대로) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">참석유형</label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 px-2"
              value={preregistered}
              onChange={(e) => setPreregistered(e.target.value as Preregistered)}
            >
              <option value="기존">기존</option>
              <option value="추가">추가</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">참석형태</label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 px-2"
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
            >
              <option value="정상">정상</option>
              <option value="지각">지각</option>
              <option value="불참">불참</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={addAttendee}
          className="h-10 w-full rounded-md bg-slate-900 text-white disabled:bg-slate-300"
          disabled={!attendeeInput.trim()}
        >
          추가
        </button>
      </div>

      {/* 테이블 영역 */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">참석유형</th>
              <th className="px-3 py-2 text-left">참석형태</th>
              <th className="px-3 py-2 text-center">삭제</th> {/* ✅ [추가] */}
            </tr>
          </thead>
          <tbody>
            {attendees.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={4}>
                  아직 추가된 출석자가 없습니다.
                </td>
              </tr>
            ) : (
              attendees.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2">{a.preregistered}</td>
                  <td className="px-3 py-2">{a.attendanceType}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100"
                      onClick={() => removeById(a.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
