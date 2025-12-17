'use client';

import { useEffect, useMemo, useState } from 'react';
import MobileHeader from '@/components/layout/MobileHeader';

import AttendanceBasicInfoSection from '@/components/attendance/AttendanceBasicInfoSection';
import AttendanceAttendeeSection from '@/components/attendance/AttendanceAttendeeSection';
import AttendanceConfirmModal from '@/components/attendance/AttendanceConfirmModal';
import type { MeetingType, AttendeeRow } from '@/types/attendance';

// ✅ Members API에서 받아올 최소 필드
type Member = {
  member_id?: string;
  name?: string;
  role?: string; // 운영진/정회원/준회원/휴면/탈퇴 등
  is_active?: string | boolean; // 시트에서 string으로 올 수 있음
};

export default function AttendanceRegisterPage() {
  // -----------------------------
  // 기본 정보 State
  // -----------------------------
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const [date, setDate] = useState(`${yyyy}-${mm}-${dd}`);
  const [sessionId, setSessionId] = useState(''); // ✅ session_id 사용자 입력
  const [meetingType, setMeetingType] = useState<MeetingType>('정기모임');
  const [gymName, setGymName] = useState(''); // ✅ 암장명
  const [writer, setWriter] = useState(''); // ✅ 작성자
  const [description, setDescription] = useState(''); // 비고/설명

  // -----------------------------
  // 참석자 State
  // -----------------------------
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]); // ✅ 변경: 초기값 빈 배열(이미 적용한 상태지만 유지)

  // -----------------------------
  // 모달/제출/에러
  // -----------------------------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // -----------------------------
  // ✅ members 로딩 (자동완성 옵션 생성용)
  // -----------------------------
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch('/api/members', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;

        setMembers(Array.isArray(json.data) ? json.data : []);
      } catch {
        // 조용히 무시
      }
    };

    loadMembers();
  }, []);


    // -----------------------------
  // ✅ 최근 회차 / GymList 로딩
  // -----------------------------
  const [recentSessionId, setRecentSessionId] = useState<string>('');
  const [gymOptions, setGymOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentSession = async () => {
      try {
        const res = await fetch('/api/attendance/recent-session', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;
        setRecentSessionId(String(json.data?.recentSessionId ?? '').trim());
      } catch {
        // 조용히 무시
      }
    };
    loadRecentSession();
  }, []);

  useEffect(() => {
    const loadGyms = async () => {
      try {
        const res = await fetch('/api/gyms', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;
        const list = Array.isArray(json.data) ? json.data : [];
        setGymOptions(list.map((x: any) => String(x ?? '').trim()).filter(Boolean));
      } catch {
        // 조용히 무시
      }
    };
    loadGyms();
  }, []);

  // -----------------------------
  // ✅ 자동완성 옵션
  // 1) writerOptions: 운영진만
  // 2) memberOptions: 활동회원(운영진/정회원/준회원)만
  // -----------------------------
  const writerOptions = useMemo(() => {
    return members
      .filter((m) => String(m.is_active).toLowerCase() === 'true')
      .filter((m) => (m.role ?? '').trim() === '운영진')
      .map((m) => (m.name ?? '').trim())
      .filter(Boolean);
  }, [members]);

  const memberOptions = useMemo(() => {
    return members
      .filter((m) => String(m.is_active).toLowerCase() === 'true')
      .filter((m) => ['운영진', '정회원', '준회원'].includes((m.role ?? '').trim()))
      .map((m) => (m.name ?? '').trim())
      .filter(Boolean);
  }, [members]);

  // -----------------------------
  // ✅ 검증
  // -----------------------------
  const validate = () => {
    const sid = String(sessionId ?? '').trim();
    const gname = String(gymName ?? '').trim();
    const w = String(writer ?? '').trim();

    if (!sid) return '회차(session_id)는 필수입니다.';
    if (!/^\d+$/.test(sid)) return '회차(session_id)는 숫자만 입력해주세요.';
    if (!date) return '날짜는 필수입니다.';
    if (!meetingType) return '모임유형은 필수입니다.';
    if (!gname) return '암장명은 필수입니다.';
    if (!w) return '작성자명은 필수입니다.';

    const named = attendees.filter((a) => String(a.name ?? '').trim().length > 0);
    if (named.length < 1) return '최소 1명 이상의 출석자가 필요합니다.';

    return '';
  };

  const canOpenConfirm = useMemo(() => {
    return validate() === '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, sessionId, meetingType, gymName, writer, attendees]);

  const handleOpenConfirm = () => {
    const msg = validate();
    if (msg) {
      setValidationError(msg);
      return;
    }
    setValidationError('');
    setConfirmOpen(true);
  };

  // ✅ 변경: 등록 성공 시 초기화 함수(날짜는 유지)
  const resetAfterSuccess = () => {
    setSessionId('');
    setMeetingType('정기모임');
    setGymName('');
    setWriter('');
    setDescription('');
    setAttendeeInput('');
    setAttendees([]);
    setValidationError('');
    // setDate(...) ❌ 날짜는 유지
  };

  // -----------------------------
  // ✅ 최종 제출: API 호출(/api/attendance/register)
  // -----------------------------
  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      setValidationError(msg);
      return;
    }

    setSubmitting(true);
    setValidationError('');

    try {
      const payload = {
        date,
        sessionId: String(sessionId).trim(),
        meetingType,
        gymName: String(gymName).trim(),
        writer: String(writer).trim(),
        description: String(description ?? '').trim(),
        attendees: attendees
          .filter((a) => String(a.name ?? '').trim().length > 0)
          .map((a) => ({
            name: String(a.name ?? '').trim(),
            preregistered: a.preregistered,
            attendanceType: a.attendanceType,
          })),
      };

      const res = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        const errMsg = json?.message ?? '출석 저장 중 오류가 발생했습니다.';
        setValidationError(errMsg);
        return;
      }

      // ✅ 성공 처리
      setConfirmOpen(false);
      alert('출석 등록 완료 ✅ (구글시트에 저장됨)');

      // ✅ 변경: 등록 완료 후 초기화(날짜는 유지)
      resetAfterSuccess();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '알 수 없는 오류';
      setValidationError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------
  // 렌더
  // -----------------------------
  return (
    <div className="min-h-screen bg-white">
      <MobileHeader title="출석 등록" />

      <main className="space-y-3 p-4">
        {validationError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {validationError}
          </div>
        )}

        <AttendanceBasicInfoSection
          date={date}
          meetingType={meetingType}
          gymName={gymName}
          writer={writer}
          description={description}
          sessionId={sessionId}
          onDateChange={setDate}
          onMeetingTypeChange={setMeetingType}
          onGymNameChange={setGymName}
          onWriterChange={setWriter}
          onDescriptionChange={setDescription}
          onSessionIdChange={setSessionId}
          writerOptions={writerOptions}
          recentSessionId={recentSessionId}
          gymOptions={gymOptions}
        />

        <AttendanceAttendeeSection
          attendeeInput={attendeeInput}
          attendees={attendees}
          onAttendeeInputChange={setAttendeeInput}
          onAttendeesChange={setAttendees}
          memberOptions={memberOptions}
        />

        <button
          type="button"
          className={[
            'w-full rounded-md px-4 py-3 text-sm font-semibold',
            canOpenConfirm ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500',
          ].join(' ')}
          onClick={handleOpenConfirm}
          disabled={!canOpenConfirm}
        >
          등록하기
        </button>

        <AttendanceConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleSubmit}
          submitting={submitting}
          payload={{
            date,
            sessionId: String(sessionId).trim(),
            meetingType,
            gymName: String(gymName).trim(),
            writer: String(writer).trim(),
            description: String(description ?? '').trim(),
            attendees: attendees
              .filter((a) => String(a.name ?? '').trim().length > 0)
              .map((a) => ({
                name: String(a.name ?? '').trim(),
                preregistered: a.preregistered,
                attendanceType: a.attendanceType,
              })),
          }}
        />
      </main>
    </div>
  );
}
