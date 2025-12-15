'use client';

import AutocompleteInput from '@/components/ui/AutocompleteInput'; // ✅ 자동완성 추가

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

  writerOptions: string[]; // ✅ 자동완성 추가
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
  writerOptions, // ✅ 자동완성 추가
}: Props) {
  const showDescription = meetingType === '대관행사' || meetingType === '기타';

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
      <div className="text-base font-semibold">기본 정보</div>

      <div className="grid gap-2">
        <label className="text-sm text-slate-600">날짜</label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-slate-600">회차(Session ID)</label>
        <input
          inputMode="numeric"
          value={sessionId}
          onChange={(e) => onSessionIdChange(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="예: 27"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-slate-600">모임 유형</label>
        <select
          value={meetingType}
          onChange={(e) => onMeetingTypeChange(e.target.value as MeetingType)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="정기모임">정기모임</option>
          <option value="대관행사">대관행사</option>
          <option value="기타">기타</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-slate-600">암장명 (필수)</label>
        <input
          value={gymName}
          onChange={(e) => onGymNameChange(e.target.value)}
          placeholder="암장명을 입력하세요"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-slate-600">작성자명 (필수)</label>

        {/* ✅ 자동완성 추가 */}
        <AutocompleteInput
          value={writer}
          onChange={onWriterChange}
          options={writerOptions}
          placeholder="작성자명을 입력하세요"
        />
      </div>

      {showDescription && (
        <div className="grid gap-2">
          <label className="text-sm text-slate-600">메모</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="대관행사/기타인 경우 메모를 입력하세요"
            className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      )}
    </section>
  );
}
