'use client';

import { useMemo, useState } from 'react';
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
  const [nameError, setNameError] = useState<string>('');

  const inputName = normalizeName(attendeeInput);

  // ✅ 회원목록을 "정규화 + 소문자" Set으로 만들어 완전일치 체크
  const memberNameSet = useMemo(() => {
    const set = new Set<string>();
    for (const opt of memberOptions ?? []) {
      const n = normalizeName(opt).toLowerCase();
      if (n) set.add(n);
    }
    return set;
  }, [memberOptions]);

  const isValidMemberName = inputName.length > 0 && memberNameSet.has(inputName.toLowerCase());

  const addAttendee = () => {
    const name = normalizeName(attendeeInput);
    if (!name) return;

    // ✅ 회원명 검증: memberOptions에 없으면 추가 불가
    if (!memberNameSet.has(name.toLowerCase())) {
      setNameError('회원목록에 없는 이름입니다. 자동완성 목록에서 선택해주세요.');
      return;
    }

    // ✅ 동일 이름 중복 방지 (공백/대소문자 normalize)
    const exists = attendees.some(
      (a) => normalizeName(a.name).toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setNameError('이미 추가된 이름입니다.');
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
    setNameError('');
    setPreregistered('기존');
    setAttendanceType('정상');
  };

  // ✅ 행 단위 삭제
  const removeById = (id: number) => {
    onAttendeesChange(attendees.filter((a) => a.id !== id));
  };

  return (
    <section className="space-y-4">
      {/* ✅ 입력 영역 */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-900">출석자명 *</label>

        <AutocompleteInput
          value={attendeeInput}
          onChange={(v) => {
            onAttendeeInputChange(v);
            // 입력이 바뀌면 에러는 일단 해제 (필요 시 다시 add에서 검증)
            if (nameError) setNameError('');
          }}
          options={memberOptions ?? []}
          placeholder="이름 입력"
          noResultsText="일치하는 회원이 없습니다."
        />

        {/* ✅ 에러 메시지 */}
        {nameError && <p className="text-xs text-rose-600">{nameError}</p>}

        {/* ✅ 입력은 됐는데 회원목록에 없을 때 가이드(선택) */}
        {!nameError && inputName.length > 0 && !isValidMemberName && (
          <p className="text-xs text-slate-500">회원목록에 있는 이름만 추가할 수 있어요.</p>
        )}
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
            <option value="기존">기존</option>
            {/* A안(회원만 가능)이면 사실상 '추가'는 의미가 약해져서 숨겨도 되지만, 일단 기존 유지 */}
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
        disabled={!isValidMemberName}
        className={[
          'h-11 w-full rounded-md text-sm font-semibold transition',
          isValidMemberName
            ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
        title={!isValidMemberName ? '회원목록에 있는 이름만 추가할 수 있어요.' : undefined}
      >
        추가
      </button>

      {/* 구분선 */}
      <div className="mt-2 border-t border-slate-200/70" />

      {/* ✅ 목록 */}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
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
                  <tr
                    key={a.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
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
