'use client';

import { useEffect, useMemo, useState } from 'react';

type AttendanceType = '정상' | '지각' | '불참';

type SessionAttendee = {
  memberId: string;
  name: string;
  preregistered: string; // 기존 | 추가
  attendanceType: AttendanceType;
  score: number | null;
};

type SessionSummary = {
  sessionId: string;
  date: string; // YYYY-MM-DD
  meetingType: string;
  gymName: string;
  writer: string;

  totalCount: number;
  normalCount: number;
  lateCount: number;
  absentCount: number;

  attendees: SessionAttendee[];
};

type PeriodFilter = '이번달' | '지난달' | '이번분기' | '지난분기' | '전체';
type SortOrder = '회차순' | '역회차순';

/* ---------------- 날짜 유틸 ---------------- */
function parseDateYMD(d: string) {
  const s = String(d ?? '').trim();
  if (!s) return null;

  const normalized = s.replace(/\s+/g, '').replace(/[./]/g, '-');
  const [yStr, mStr, dayStr] = normalized.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const day = Number(dayStr);

  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function getQuarter(m0: number) {
  return Math.floor(m0 / 3) + 1;
}

// ✅ meetingType 뱃지 색상 매핑 (다크모드/브랜드 기준)
function meetingTypeBadgeClass(meetingType: string) {
  const t = String(meetingType ?? '').trim();

  if (t === '정기모임') {
    return 'border-white/10 bg-brand/20 text-fg';
  }

  if (t === '대관행사') {
    return 'border-white/10 bg-blue-500/20 text-fg';
  }

  if (t === '기타') {
    return 'border-white/10 bg-white/10 text-fg/80';
  }

  // fallback (예상치 못한 값)
  return 'border-white/10 bg-white/10 text-fg/80';
}


export default function SessionView() {
  /* ---------- state ---------- */
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState<PeriodFilter>('이번달');
  const [sortOrder, setSortOrder] = useState<SortOrder>('역회차순');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const periodOptions: PeriodFilter[] = ['이번달', '지난달', '이번분기', '지난분기', '전체'];

  /* ---------- 데이터 로딩 ---------- */
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/attendance/history', { cache: 'no-store' });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          setError(json?.message ?? '출석현황 조회 실패');
          setSessions([]);
          return;
        }

        setSessions(Array.isArray(json.sessions) ? json.sessions : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  /* ---------- 기간 필터 ---------- */
  const periodFiltered = useMemo(() => {
    if (period === '전체') return sessions;

    const now = new Date();
    const y = now.getFullYear();
    const m0 = now.getMonth();
    const q = getQuarter(m0);

    const prevMonth = new Date(y, m0 - 1, 1);
    const prevMonthY = prevMonth.getFullYear();
    const prevMonthM0 = prevMonth.getMonth();

    let prevQ = q - 1;
    let prevQY = y;
    if (prevQ === 0) {
      prevQ = 4;
      prevQY = y - 1;
    }

    return sessions.filter((s) => {
      const d = parseDateYMD(s.date);
      if (!d) return false;

      if (period === '이번달') return d.getFullYear() === y && d.getMonth() === m0;
      if (period === '지난달') return d.getFullYear() === prevMonthY && d.getMonth() === prevMonthM0;
      if (period === '이번분기') return d.getFullYear() === y && getQuarter(d.getMonth()) === q;
      if (period === '지난분기') return d.getFullYear() === prevQY && getQuarter(d.getMonth()) === prevQ;

      return true;
    });
  }, [sessions, period]);

  /* ---------- 정렬 ---------- */
  const displaySessions = useMemo(() => {
    // ✅ 변경: 전체든 아니든, slice 제거. 기간 필터 결과를 전부 보여줌.
    if (period !== '전체') {
      return [...periodFiltered].sort((a, b) => {
        return (parseDateYMD(b.date)?.getTime() ?? 0) - (parseDateYMD(a.date)?.getTime() ?? 0);
      });
    }

    // 전체일 때만 회차 정렬 적용
    const arr = [...periodFiltered];
    arr.sort((a, b) => {
      const diff = Number(a.sessionId) - Number(b.sessionId);
      return sortOrder === '회차순' ? diff : -diff;
    });
    return arr;
  }, [periodFiltered, period, sortOrder]);

  const toggleExpand = (sid: string) => {
    setExpandedSessionId((prev) => (prev === sid ? null : sid));
  };

  const toggleSort = () => {
    setSortOrder((p) => (p === '역회차순' ? '회차순' : '역회차순'));
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-3">
      {/* 헤더: CardSection이 title을 제공하므로, 여기서는 정렬 버튼만 우측 배치 */}
      <div className="flex items-center justify-end">
        {period === '전체' && (
          <button
            type="button"
            onClick={toggleSort}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-fg transition hover:bg-white/10 active:scale-[0.99]"
          >
            회차 {sortOrder === '역회차순' ? '▼' : '▲'}
          </button>
        )}
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periodOptions.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={[
              'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition',
              period === p
                ? 'border-white/10 bg-brand/15 text-fg'
                : 'border-white/10 bg-white/5 text-fg/70 hover:bg-white/10 hover:text-fg',
            ].join(' ')}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 상태 */}
      {loading && <div className="text-sm text-fg/70">불러오는 중...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Empty State */}
      {!loading && !error && displaySessions.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-fg/80">
          <div className="font-semibold text-fg">표시할 출석 기록이 없습니다.</div>
          <div className="mt-1 text-xs text-fg/70">
            선택한 기간에 등록된 모임이 없어요. <span className="font-semibold text-fg">출석 등록</span>에서 먼저
            등록하거나, 기간 필터를 <span className="font-semibold text-fg">전체</span>로 변경해보세요.
          </div>
        </div>
      )}

      {/* 내부 스크롤 영역 */}
      {!loading && !error && displaySessions.length > 0 && (
        <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
          {displaySessions.map((s) => {
            const expanded = expandedSessionId === s.sessionId;

            return (
              <div key={s.sessionId} className="rounded-2xl border border-white/10 bg-white/5">
                <button
                  type="button"
                  className="w-full space-y-1 p-4 text-left transition hover:bg-white/5"
                  onClick={() => toggleExpand(s.sessionId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* sessionId 배지 + 날짜 */}
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-semibold text-fg">
                          {s.sessionId}회
                        </span>
                        <div className="text-sm font-semibold text-fg">{s.date}</div>
                      </div>

                      <div className="mt-1 truncate text-sm text-fg/80">{s.gymName}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {/* meetingType 배지: 기존 함수 유지 */}
                      <span
                        className={[
                          'rounded-full border px-2 py-0.5 text-xs font-semibold',
                          meetingTypeBadgeClass(s.meetingType),
                        ].join(' ')}
                      >
                        {s.meetingType}
                      </span>
                      <span className="text-xs text-fg/70">{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-fg/60">작성자: {s.writer}</div>

                  {/* 요약 */}
                  <div className="mt-1 text-sm font-semibold text-fg">총 출석자 {s.totalCount}명</div>
                  <div className="text-xs text-fg/70">
                    정상 {s.normalCount} · 지각 {s.lateCount} · 불참 {s.absentCount}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-white/10 p-4">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-fg/60">
                        <tr>
                          <th className="text-left font-semibold">이름</th>
                          <th className="font-semibold">참석유형</th>
                          <th className="font-semibold">참석형태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.attendees.map((a, i) => (
                          <tr key={i} className="border-t border-white/10">
                            <td className="py-2 text-fg">{a.name}</td>
                            <td className="text-center text-fg/80">{a.preregistered}</td>
                            <td className="text-center text-fg/80">{a.attendanceType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
