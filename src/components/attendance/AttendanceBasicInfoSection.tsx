'use client';

import AutocompleteInput from '@/components/ui/AutocompleteInput';
import { Input } from '@/components/ui/input';

type MeetingType = '정기모임' | '대관행사' | '기타';

type Props = {
  date: string;
  meetingType: MeetingType;
  gymName: string;
  writer: string;
  description: string;
  sessionId: string;

  onDateChange: (v: string) => void;
  onMeetingTypeChange: (v: MeetingType) => void;
  onGymNameChange: (v: string) => void;
  onWriterChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSessionIdChange: (v: string) => void;

  writerOptions: string[];
  recentSessionId?: string;
  gymOptions?: string[];
};

export default function AttendanceBasicInfoSection({
  date,
  meetingType,
  gymName,
  writer,
  description,
  sessionId,
  onDateChange,
  onMeetingTypeChange,
  onGymNameChange,
  onWriterChange,
  onDescriptionChange,
  onSessionIdChange,
  writerOptions,
  recentSessionId,
  gymOptions,
}: Props) {
  const showDescription = meetingType === '대관행사' || meetingType === '기타';

  return (
    <section className="space-y-4">
      {/* ✅ 날짜 + 회차 (한 줄) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">날짜 *</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            // ✅ type=date 브라우저 기본 룩 억제
            className="appearance-none"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-900">회차 *</label>
            <span className="text-xs text-slate-500">(최근회차: {recentSessionId ?? '-'})</span>
          </div>

          <Input
            inputMode="numeric"
            value={sessionId}
            onChange={(e) => onSessionIdChange(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="예: 123"
          />
        </div>
      </div>

      {/* ✅ 모임 유형 */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-900">모임 유형 *</label>
        <select
          value={meetingType}
          onChange={(e) => onMeetingTypeChange(e.target.value as MeetingType)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition
                     placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40"
        >
          <option value="정기모임">정기모임</option>
          <option value="대관행사">대관행사</option>
          <option value="기타">기타</option>
        </select>
      </div>

      {/* ✅ 암장명 */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-900">암장명 *</label>
        <AutocompleteInput
          value={gymName}
          onChange={onGymNameChange}
          options={gymOptions ?? []}
          placeholder="암장명을 입력하세요"
          noResultsText="일치하는 암장이 없습니다."
        />
      </div>

      {/* ✅ 작성자명 */}
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-900">작성자명 *</label>
        <AutocompleteInput
          value={writer}
          onChange={onWriterChange}
          options={writerOptions}
          placeholder="작성자명을 입력하세요"
        />
      </div>

      {/* ✅ 메모 */}
      {showDescription && (
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">메모</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="대관행사/기타인 경우 메모를 입력하세요"
            className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition
                       placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40"
          />
        </div>
      )}
    </section>
  );
}
