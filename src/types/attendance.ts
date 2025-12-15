// ✅ 공용 타입 (여기만 보며 유지보수)

export type MeetingType = '정기모임' | '대관행사' | '기타';

export type Preregistered = '기존' | '추가';
export type AttendanceType = '정상' | '지각' | '불참';

export type AttendeeRow = {
  id: number;
  name: string;
  preregistered: Preregistered;   // 참석유형
  attendanceType: AttendanceType; // 참석형태
};
