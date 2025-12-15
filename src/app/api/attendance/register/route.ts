import { NextResponse } from 'next/server';
import { saveAttendanceSession } from '@/lib/server/attendanceService';
import type { MeetingType } from '@/types/attendance';

/**
 * ✅ 프론트에서 보내는 camelCase payload (권장)
 * {
 *   date: string;              // YYYY-MM-DD
 *   sessionId: string;         // 숫자 문자열
 *   meetingType: '정기모임' | '대관행사' | '기타';
 *   gymName: string;
 *   writer: string;
 *   description?: string;      // note 역할
 *   attendees: {
 *     name: string;
 *     preregistered: '기존' | '추가';
 *     attendanceType: '정상' | '지각' | '불참';
 *   }[];
 * }
 *
 * ✅ 내부 저장 서비스(구글시트)에는 snake_case로 변환해서 전달
 * (attendanceService.ts를 당장 안 건드리기 위해 route에서 변환)
 */

// POST /api/attendance/register
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ [변경] camelCase 기준으로 입력 받기
    const {
      date,
      sessionId,
      meetingType,
      gymName,
      writer,
      description,
      attendees,
    } = body ?? {};

    // ✅ 최소 검증 (프론트 검증이 있어도 서버는 한 번 더)
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ ok: false, message: '날짜가 올바르지 않습니다.' }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== 'string' || !/^\d+$/.test(sessionId)) {
      return NextResponse.json({ ok: false, message: '회차(Session ID)는 숫자만 입력해야 합니다.' }, { status: 400 });
    }

    if (!meetingType || typeof meetingType !== 'string') {
      return NextResponse.json({ ok: false, message: '모임 유형이 올바르지 않습니다.' }, { status: 400 });
    }

    if (!gymName || typeof gymName !== 'string' || gymName.trim().length === 0) {
      return NextResponse.json({ ok: false, message: '암장명은 필수입니다.' }, { status: 400 });
    }

    if (!writer || typeof writer !== 'string' || writer.trim().length === 0) {
      return NextResponse.json({ ok: false, message: '작성자명은 필수입니다.' }, { status: 400 });
    }

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ ok: false, message: '출석자 명단을 1명 이상 추가하세요.' }, { status: 400 });
    }

    // ✅ [변경] attendanceService가 기대하는 snake_case로 변환
    const payloadForService = {
      date,
      session_id: sessionId,
      meeting_type: meetingType as MeetingType,
      gym_name: gymName,
      writer,
      note: typeof description === 'string' ? description : '',
      attendees: attendees.map((a: any) => ({
        name: String(a?.name ?? '').trim(),
        pre_registered: a?.preregistered,      // camelCase -> snake_case key
        attendance_type: a?.attendanceType,    // camelCase -> snake_case key
      })),
    };

    // ✅ attendee 개별 검증(빈 이름 방지)
    const hasInvalidName = payloadForService.attendees.some((a: any) => !a.name);
    if (hasInvalidName) {
      return NextResponse.json({ ok: false, message: '출석자 이름은 비워둘 수 없습니다.' }, { status: 400 });
    }

    const result = await saveAttendanceSession(payloadForService);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      { ok: false, message: `출석 저장 중 오류: ${message}` },
      { status: 500 },
    );
  }
}
