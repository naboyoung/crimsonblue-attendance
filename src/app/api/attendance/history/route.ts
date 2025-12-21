import { NextResponse } from 'next/server';
import { readSheetObjects } from '@/lib/server/googleSheets';

const SHEET_ATTENDANCE = 'AttendanceHistory';

type AttendanceType = '정상' | '지각' | '불참';

type AttendanceRow = {
  session_id?: string | number;
  date?: string;
  meeting_type?: string;
  gym_name?: string;
  writer?: string;
  member_id?: string;
  name?: string;
  preregistered?: string;
  attendance_type?: AttendanceType | string;
  score?: string | number;
};

type SessionAttendee = {
  memberId: string;
  name: string;
  preregistered: string;
  attendanceType: AttendanceType;
  score: number | null;
};

type SessionSummary = {
  sessionId: string;
  date: string;
  meetingType: string;
  gymName: string;
  writer: string;

  totalCount: number;
  normalCount: number;
  lateCount: number;
  absentCount: number;

  attendees: SessionAttendee[];
};

/** ✅ 핵심: 세션 분리 키 */
function getSessionKey(sessionId: string, gymName: string) {
  return `${sessionId}__${gymName || 'UNKNOWN_GYM'}`;
}

export async function GET(req: Request) {
  try {
    const raw = (await readSheetObjects(SHEET_ATTENDANCE)) as AttendanceRow[];

    // 1) 정규화
    const rows = raw
      .map((r) => {
        const sessionId = String(r.session_id ?? '').trim();
        const date = String(r.date ?? '').trim();
        if (!sessionId || !date) return null;

        const at = String(r.attendance_type ?? '').trim() as AttendanceType;
        const attendanceType: AttendanceType =
          at === '정상' || at === '지각' || at === '불참' ? at : '정상';

        const scoreRaw = r.score;
        const scoreNum =
          scoreRaw === '' || scoreRaw === undefined || scoreRaw === null
            ? null
            : Number(scoreRaw);

        return {
          sessionId,
          date,
          meetingType: String(r.meeting_type ?? '').trim(),
          gymName: String(r.gym_name ?? '').trim(),
          writer: String(r.writer ?? '').trim(),
          memberId: String(r.member_id ?? '').trim(),
          name: String(r.name ?? '').trim(),
          preregistered: String(r.preregistered ?? '').trim(),
          attendanceType,
          score: Number.isFinite(scoreNum) ? scoreNum : null,
        };
      })
      .filter(Boolean) as Array<{
        sessionId: string;
        date: string;
        meetingType: string;
        gymName: string;
        writer: string;
        memberId: string;
        name: string;
        preregistered: string;
        attendanceType: AttendanceType;
        score: number | null;
      }>;

    // 2) ✅ sessionId + gymName 기준 그룹핑
    const map = new Map<string, SessionSummary>();

    for (const r of rows) {
      const key = getSessionKey(r.sessionId, r.gymName);

      if (!map.has(key)) {
        map.set(key, {
          sessionId: r.sessionId,
          date: r.date,
          meetingType: r.meetingType,
          gymName: r.gymName,
          writer: r.writer,
          totalCount: 0,
          normalCount: 0,
          lateCount: 0,
          absentCount: 0,
          attendees: [],
        });
      }

      const s = map.get(key)!;

      s.totalCount += 1;
      if (r.attendanceType === '정상') s.normalCount += 1;
      if (r.attendanceType === '지각') s.lateCount += 1;
      if (r.attendanceType === '불참') s.absentCount += 1;

      s.attendees.push({
        memberId: r.memberId,
        name: r.name,
        preregistered: r.preregistered,
        attendanceType: r.attendanceType,
        score: r.score,
      });
    }

    // 3) 배열 변환 + 정렬
    const sessions = Array.from(map.values()).sort((a, b) => {
      const an = Number(a.sessionId);
      const bn = Number(b.sessionId);
      if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an;
      return String(b.sessionId).localeCompare(String(a.sessionId));
    });

    return NextResponse.json({ ok: true, sessions }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { ok: false, message: `출석현황 조회 중 오류: ${message}` },
      { status: 500 },
    );
  }
}
