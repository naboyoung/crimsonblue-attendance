'use client';

import { useState } from 'react';
import AutocompleteInput from '@/components/ui/AutocompleteInput';
import type { AttendeeRow, Preregistered, AttendanceType } from '@/types/attendance';

type Props = {
  attendeeInput: string;
  attendees: AttendeeRow[];
  onAttendeeInputChange: (v: string) => void;
  onAttendeesChange: (next: AttendeeRow[]) => void;
  memberOptions: string[];
};

function normalizeName(v: string) {
  return String(v ?? '').trim().replace(/\s+/g, ' ');
}

export default function AttendanceAttendeeSection({
  attendeeInput,
  attendees,
  onAttendeeInputChange,
  onAttendeesChange,
  memberOptions,
}: Props) {
  const [preregistered, setPreregistered] = useState<Preregistered>('기존');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('정상');

  const canAdd = normalizeName(attendeeInput).length > 0;

  const addAttendee = () => {
    const name = normalizeName(attendeeInput);
    if (!name) return;

    // ✅ 동일 이름 중복 방지 (공백/대소문자 normalize)
    const exists = attendees.some(
      (a) => normalizeName(a.name).toLowerCase() === name.toLowerCase()
    );
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

  // ✅ 행 단위 삭제
  const removeById = (id: number) => {
    onAttendeesChange(attendees.filter((a) => a.id !== id));
  };

  return (
    <section className="space-y-4">
      {/* ✅ 입력 영역(카드 제거, 흐름형) */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-900">출석자명 *</label>

        <AutocompleteInput
          value={attendeeInput}
          onChange={onAttendeeInputChange}
          options={memberOptions ?? []}
          placeholder="이름 입력"
          noResultsText="일치하는 회원이 없습니다."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">유형</label>
          <select
            value={preregistered}
            onChange={(e) => setPreregistered(e.target.value as Preregistered)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40"
          >
            {/* ✅ 기존 코드 옵션 유지 */}
            <option value="기존">기존</option>
            <option value="추가">추가</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">형태</label>
          <select
            value={attendanceType}
            onChange={(e) => setAttendanceType(e.target.value as AttendanceType)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40"
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
        disabled={!attendeeInput.trim()}
        className={[
          'h-11 w-full rounded-md text-sm font-semibold transition',
          attendeeInput.trim()
           ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
           : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        추가
      </button>

      {/* 구분선 */}
      <div className="mt-2 border-t border-slate-200/70"/>

      {/* ✅ 목록(테이블 유지, 톤만 정리) */}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      
      {/* ✅ 스크롤 컨테이너 */}
      <div className="max-h-[260px] overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-center font-semibold">
                이름
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-center font-semibold">
                유형
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-center font-semibold">
                형태
              </th>
              <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-center font-semibold">
                삭제
              </th>
            </tr>
          </thead>

          <tbody className="text-slate-800">
            {attendees.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-center text-sm text-slate-500" colSpan={4}>
                  아직 추가된 출석자가 없습니다.
                </td>
              </tr>
            ) : (
              attendees.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-medium text-slate-900">{a.name}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{a.preregistered}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{a.attendanceType}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
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
    </div>

    </section>
  );
}
