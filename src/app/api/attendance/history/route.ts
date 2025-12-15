import { NextResponse } from 'next/server';
import { readSheetObjects } from '@/lib/server/googleSheets';

// AttendanceHistory 시트명
const SHEET_ATTENDANCE = 'AttendanceHistory';

type AttendanceType = '정상' | '지각' | '불참';

type AttendanceRow = {
  attendance_id?: string;
  session_id?: string | number;
  date?: string;
  meeting_type?: string;
  gym_name?: string;
  writer?: string;
  member_id?: string;
  name?: string;
  preregistered?: string; // '기존' | '추가'
  attendance_type?: AttendanceType | string;
  score?: string | number;
  created_at?: string;
  note?: string;
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

  // ✅ Session View의 상세 펼침에서 바로 쓰려고 같이 내려줌
  attendees: SessionAttendee[];
};

// GET /api/attendance/history
// - 기본: session_id 기준으로 그룹핑된 목록 반환
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // ✅ (확장용) 추후 필요하면 ?sessionId=27 처럼 단일 조회도 가능
    const onlySessionId = (url.searchParams.get('sessionId') ?? '').trim();

    const raw = (await readSheetObjects(SHEET_ATTENDANCE)) as AttendanceRow[];

    // 1) 정규화 + (옵션) sessionId 필터
    const rows = raw
      .map((r) => {
        const sessionId = String(r.session_id ?? '').trim();
        const date = String(r.date ?? '').trim();

        // attendance_type 정규화
        const at = String(r.attendance_type ?? '').trim() as AttendanceType;
        const attendanceType: AttendanceType =
          at === '정상' || at === '지각' || at === '불참' ? at : '정상';

        const scoreRaw = r.score;
        const scoreNum = scoreRaw === '' || scoreRaw === undefined || scoreRaw === null
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
      .filter((r) => r.sessionId && r.date) // 최소 조건
      .filter((r) => (onlySessionId ? r.sessionId === onlySessionId : true));

    // 2) session_id 기준 그룹핑
    const map = new Map<string, SessionSummary>();

    for (const r of rows) {
      if (!map.has(r.sessionId)) {
        map.set(r.sessionId, {
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

      const s = map.get(r.sessionId)!;

      // ✅ 혹시 같은 sessionId인데 메타가 다른 row가 있으면 "처음 값 유지"
      // (운영상 session_id는 유니크라는 전제)
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

    // 3) 배열 변환 + 정렬(기본: 역회차순)
    const sessions = Array.from(map.values()).sort((a, b) => {
      const an = Number(a.sessionId);
      const bn = Number(b.sessionId);
      if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an;
      return String(b.sessionId).localeCompare(String(a.sessionId));
    });

    return NextResponse.json(
      { ok: true, sessions },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { ok: false, message: `출석현황 조회 중 오류: ${message}` },
      { status: 500 },
    );
  }
}
