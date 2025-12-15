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

const DEFAULT_RECENT_LIMIT = 5;

/* ---------------- 날짜 유틸 ---------------- */
function parseDateYMD(d: string) {
  const s = String(d ?? '').trim();
  if (!s) return null;

  const normalized = s
    .replace(/\s+/g, '')
    .replace(/[./]/g, '-');

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

export default function SessionView() {
  /* ---------- state ---------- */
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState<PeriodFilter>('이번달');
  const [sortOrder, setSortOrder] = useState<SortOrder>('역회차순');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const periodOptions: PeriodFilter[] = [
    '이번달',
    '지난달',
    '이번분기',
    '지난분기',
    '전체',
  ];

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

      if (period === '이번달')
        return d.getFullYear() === y && d.getMonth() === m0;
      if (period === '지난달')
        return d.getFullYear() === prevMonthY && d.getMonth() === prevMonthM0;
      if (period === '이번분기')
        return d.getFullYear() === y && getQuarter(d.getMonth()) === q;
      if (period === '지난분기')
        return d.getFullYear() === prevQY && getQuarter(d.getMonth()) === prevQ;

      return true;
    });
  }, [sessions, period]);

  /* ---------- 정렬 & 최근 5개 ---------- */
  const displaySessions = useMemo(() => {
    const byDateDesc = [...periodFiltered].sort((a, b) => {
      return (
        (parseDateYMD(b.date)?.getTime() ?? 0) -
        (parseDateYMD(a.date)?.getTime() ?? 0)
      );
    });

    if (period !== '전체') {
      return byDateDesc.slice(0, DEFAULT_RECENT_LIMIT);
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Session View</div>
        {period === '전체' && (
          <button
            onClick={toggleSort}
            className="rounded-md border px-2 py-1 text-xs font-semibold"
          >
            회차 {sortOrder === '역회차순' ? '▼' : '▲'}
          </button>
        )}
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-2 overflow-x-auto">
        {periodOptions.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold',
              period === p
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700',
            ].join(' ')}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 상태 */}
      {loading && <div className="text-sm">불러오는 중...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* 리스트 */}
      {!loading &&
        !error &&
        displaySessions.map((s) => {
          const expanded = expandedSessionId === s.sessionId;

          return (
            <div key={s.sessionId} className="rounded-md border bg-white">
              <button
                className="w-full text-left p-4 space-y-1"
                onClick={() => toggleExpand(s.sessionId)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">
                      {s.sessionId}회 · {s.date}
                    </div>
                    <div className="text-sm text-slate-700">
                      {s.gymName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {s.meetingType}
                    </span>
                    <span className="text-xs">{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500">작성자: {s.writer}</div>

                {/* 요약 */}
                <div className="mt-1 text-sm font-semibold">
                  총 출석자 {s.totalCount}명
                </div>
                <div className="text-xs text-slate-600">
                  정상 {s.normalCount} · 지각 {s.lateCount} · 불참 {s.absentCount}
                </div>
              </button>

              {expanded && (
                <div className="border-t p-4">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="text-left">이름</th>
                        <th>참석유형</th>
                        <th>참석형태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.attendees.map((a, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1">{a.name}</td>
                          <td className="text-center">{a.preregistered}</td>
                          <td className="text-center">{a.attendanceType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

      {period !== '전체' && displaySessions.length > 0 && (
        <div className="text-xs text-slate-500">
          최근 {DEFAULT_RECENT_LIMIT}개 모임만 표시됩니다.
        </div>
      )}
    </div>
  );
}
