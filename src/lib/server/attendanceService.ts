import crypto from 'crypto';
import type { MeetingType } from '@/types/attendance';
import { readSheetObjects, appendRows, nowKSTString } from '@/lib/server/googleSheets'; // ✅ (유틸 사용)

type AttendanceRegisterPayload = {
  date: string; // YYYY-MM-DD
  session_id: string; // 숫자 문자열
  meeting_type: MeetingType;
  gym_name: string;
  writer: string;
  note?: string;
  attendees: {
    name: string;
    pre_registered: '기존' | '추가';
    attendance_type: '정상' | '지각' | '불참';
  }[];
};

type SaveOk = { ok: true };
type SaveFail = { ok: false; status: number; message: string };
type SaveResult = SaveOk | SaveFail;

const SHEET_MEMBERS = 'Members';
const SHEET_ATTENDANCE = 'AttendanceHistory';
const SHEET_SCORE_RULE = 'ScoreRule'; // ✅ ScoreRule 시트

// ✅ ScoreRule lookup key 생성
function makeRuleKey(role: string, preregistered: string, attendanceType: string) {
  return `${role}||${preregistered}||${attendanceType}`;
}

// ✅ 안전한 점수 파싱 (시트에는 문자열로 들어올 수 있음)
function parseScore(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * ✅ 출석 1세션 저장(= 참석자 행 N개를 AttendanceHistory에 append)
 * - Members: name -> { member_id, role } 매핑
 * - ScoreRule: (role, preregistered, attendance_type) -> score 매핑
 * - AttendanceHistory: score 컬럼에 자동 반영
 */
export async function saveAttendanceSession(payload: AttendanceRegisterPayload): Promise<SaveResult> {
  try {
    // -----------------------
    // 1) 최소 유효성 검증
    // -----------------------
    if (!payload?.date?.trim()) {
      return { ok: false, status: 400, message: '날짜(date)는 필수입니다.' };
    }
    if (!payload?.session_id?.trim() || !/^\d+$/.test(payload.session_id.trim())) {
      return { ok: false, status: 400, message: '회차(session_id)는 숫자만 입력해야 합니다.' };
    }
    if (!payload?.meeting_type) {
      return { ok: false, status: 400, message: '모임 유형(meeting_type)은 필수입니다.' };
    }
    if (!payload?.gym_name?.trim()) {
      return { ok: false, status: 400, message: '암장명(gym_name)은 필수입니다.' };
    }
    if (!payload?.writer?.trim()) {
      return { ok: false, status: 400, message: '작성자명(writer)은 필수입니다.' };
    }
    if (!Array.isArray(payload.attendees) || payload.attendees.length === 0) {
      return { ok: false, status: 400, message: '출석자 명단(attendees)을 1명 이상 추가하세요.' };
    }

    // -----------------------
    // 2) Members 시트 읽기 → name -> {memberId, role}
    // -----------------------
    const members = await readSheetObjects(SHEET_MEMBERS);

    // ✅ name 기준 lookup (동명이인이 없다는 운영 가정)
    const memberByName = new Map<string, { memberId: string; role: string }>();
    for (const m of members) {
      const name = String(m.name ?? '').trim();
      if (!name) continue;

      const memberId = String(m.member_id ?? '').trim();
      const role = String(m.role ?? '').trim();

      // 이름 중복이 있으면 마지막 값이 덮어씌워짐.
      // (동명이인 정책이 생기면 member_id 선택 UI가 필요)
      memberByName.set(name, { memberId, role });
    }

    // -----------------------
    // 3) ScoreRule 시트 읽기 → (role, preregistered, attendance_type) -> score
    // -----------------------
    const rules = await readSheetObjects(SHEET_SCORE_RULE);

    // ✅ 룰 맵 구성
    const scoreRuleMap = new Map<string, number>();
    for (const r of rules) {
      const role = String(r.role ?? '').trim();
      const preregistered = String(r.preregistered ?? '').trim();
      const attendanceType = String(r.attendance_type ?? '').trim();
      const score = parseScore(r.score);

      if (!role || !preregistered || !attendanceType || score === null) continue;

      scoreRuleMap.set(makeRuleKey(role, preregistered, attendanceType), score);
    }

    // -----------------------
    // 4) 시트에 append할 row 구성
    // -----------------------
    const createdAt = nowKSTString();
    const note = payload.note?.trim() ?? '';

    const rows: (string | number)[][] = payload.attendees.map((a) => {
      const attendanceId = crypto.randomUUID(); // ✅ attendance_id 자동 생성
      const attendeeName = String(a.name ?? '').trim();

      if (!attendeeName) {
        // ✅ 참석자 이름 공백 방지 (서버 기준으로도 방어)
        throw new Error('출석자 이름은 비워둘 수 없습니다.');
      }

      const memberInfo = memberByName.get(attendeeName);
      const memberId = memberInfo?.memberId ?? '';
      const role = memberInfo?.role ?? '';

      // ✅ Members에서 role을 못 찾으면 점수 계산 불가 → 저장 실패(데이터 무결성)
      if (!role) {
        throw new Error(`Members 시트에서 역할(role)을 찾을 수 없습니다: ${attendeeName}`);
      }

      // ✅ ScoreRule에서 score lookup
      const key = makeRuleKey(role, a.pre_registered, a.attendance_type);
      const score = scoreRuleMap.get(key);

      if (score === undefined) {
        throw new Error(
          `ScoreRule 시트에 점수 규칙이 없습니다: role=${role}, preregistered=${a.pre_registered}, attendance_type=${a.attendance_type}`,
        );
      }

      // ✅ AttendanceHistory 컬럼 순서에 맞춰 row 구성
      // (아래 순서는 네 시트 컬럼과 정확히 1:1로 맞춰야 함)
      const row = [
        attendanceId,          // attendance_id
        payload.session_id,    // session_id
        payload.date,          // date
        payload.meeting_type,  // meeting_type
        payload.gym_name,      // gym_name
        payload.writer,        // writer
        memberId,              // member_id
        attendeeName,          // name
        a.pre_registered,      // preregistered
        a.attendance_type,     // attendance_type
        score,                 // ✅ score (이제 채워짐)
        createdAt,             // created_at
        note,                  // note
      ];

      return row;
    });

    // -----------------------
    // 5) AttendanceHistory에 append
    // -----------------------
    await appendRows(SHEET_ATTENDANCE, rows);

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';

    // ✅ 점수 규칙/멤버 role 누락은 400으로 반환 (사용자 입력/시트 설정 이슈)
    if (
      msg.includes('ScoreRule 시트에 점수 규칙이 없습니다') ||
      msg.includes('Members 시트에서 역할(role)을 찾을 수 없습니다') ||
      msg.includes('출석자 이름은 비워둘 수 없습니다')
    ) {
      return { ok: false, status: 400, message: msg };
    }

    return { ok: false, status: 500, message: msg };
  }
}
