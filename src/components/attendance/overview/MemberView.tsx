'use client';

import { useEffect, useMemo, useState } from 'react';

type AttendanceType = '정상' | '지각' | '불참';

type SessionAttendee = {
  memberId?: string;
  name: string;
  preregistered: string; // '기존' | '추가'
  attendanceType: AttendanceType;
  score: number | null;
};

type SessionSummary = {
  sessionId: string;
  date: string; // YYYY-MM-DD or YYYY. MM. DD etc.
  meetingType: string;
  gymName: string;
  writer: string;

  totalCount: number;
  normalCount: number;
  lateCount: number;
  absentCount: number;

  attendees: SessionAttendee[];
};

type Member = {
  member_id?: string;
  name?: string;
  role?: string; // 운영진/정회원/준회원/휴면/탈퇴
  is_active?: string | boolean;
  join_date?: string; // snake 가능
  joinDate?: string; // camel 가능
};

type RoleFilter = '전체' | '운영진' | '정회원' | '준회원';

type SortKey = 'name' | 'score';
type SortDir = 'asc' | 'desc';

type MemberCardRow = {
  memberId: string;
  name: string;
  role: '운영진' | '정회원' | '준회원';
  joinDateRaw: string; // join_date/joinDate 원본 (신입 판정용)
  quarterScore: number;
  halfScore: number;
  displayScore: number;
  displayPeriodLabel: '이번분기' | '이번반기';
};

type MemberAttendanceRow = {
  gymName: string;
  date: string;
  preregistered: string;
  attendanceType: AttendanceType;
  score: number;
  writer: string;
};

/* ------------------------ 설정(여기만 바꾸면 됨) ------------------------ */
const MIN_QUARTER_SCORE_BY_ROLE: Record<'운영진' | '정회원', number> = {
  운영진: 3,
  정회원: 3,
};

const MIN_HALF_SCORE_FOR_JUNIOR = 4;
/* ---------------------------------------------------------------------- */

/* ---------------- 유틸 ---------------- */
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

function parseJoinYearMonth(join: string) {
  const s = String(join ?? '').trim();
  if (!s) return null;

  const normalized = s.replace(/\s+/g, '').replace(/[./]/g, '-');
  const [yStr, mStr] = normalized.split('-');

  const y = Number(yStr);
  const m = Number(mStr);

  if (!y || !m) return null;
  return { y, m };
}

function getQuarter(m0: number) {
  return Math.floor(m0 / 3) + 1;
}

function inQuarter(date: Date, y: number, q: number) {
  return date.getFullYear() === y && getQuarter(date.getMonth()) === q;
}

function getHalf(m0: number) {
  return m0 <= 5 ? 1 : 2;
}

function inHalf(date: Date, y: number, half: 1 | 2) {
  return date.getFullYear() === y && getHalf(date.getMonth()) === half;
}

function safeScore(v: number | null | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function isActiveTrue(v: unknown) {
  return String(v).toLowerCase() === 'true';
}

function isActiveRole(role?: string) {
  const r = (role ?? '').trim();
  return r === '운영진' || r === '정회원' || r === '준회원';
}

function monthsDiff(nowY: number, nowM: number, joinY: number, joinM: number) {
  return nowY * 12 + nowM - (joinY * 12 + joinM);
}

function getJoinDateRaw(m: Member) {
  return String((m as any).join_date ?? (m as any).joinDate ?? '').trim();
}

/* ---------------- 컴포넌트 ---------------- */
export default function MemberView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [nameQuery, setNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('전체');

  const [onlyNewbie, setOnlyNewbie] = useState(false);
  const [onlyUnderScore, setOnlyUnderScore] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [membersRes, sessionsRes] = await Promise.all([
          fetch('/api/members', { cache: 'no-store' }),
          fetch('/api/attendance/history', { cache: 'no-store' }),
        ]);

        const membersJson = await membersRes.json().catch(() => null);
        const sessionsJson = await sessionsRes.json().catch(() => null);

        if (!membersRes.ok || !membersJson?.ok) {
          throw new Error(membersJson?.message ?? '회원 목록을 불러오지 못했습니다.');
        }
        if (!sessionsRes.ok || !sessionsJson?.ok) {
          throw new Error(sessionsJson?.message ?? '출석현황을 불러오지 못했습니다.');
        }

        const memberArr = Array.isArray(membersJson.data)
          ? membersJson.data
          : Array.isArray(membersJson.members)
            ? membersJson.members
            : [];

        const sessionArr = Array.isArray(sessionsJson.sessions) ? sessionsJson.sessions : [];

        setMembers(memberArr);
        setSessions(sessionArr);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
        setMembers([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeMembers = useMemo(() => {
    return members
      .filter((m) => isActiveTrue((m as any).is_active ?? (m as any).isActive))
      .filter((m) => isActiveRole((m as any).role))
      .map((m) => ({
        memberId: String((m as any).member_id ?? (m as any).memberId ?? '').trim(),
        name: String((m as any).name ?? '').trim(),
        role: String((m as any).role ?? '').trim() as '운영진' | '정회원' | '준회원',
        joinDateRaw: getJoinDateRaw(m),
      }))
      .filter((m) => m.memberId && m.name);
  }, [members]);

  const nameToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of activeMembers) map.set(m.name, m.memberId);
    return map;
  }, [activeMembers]);

  const thisQuarterSessions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const q = getQuarter(now.getMonth());

    return sessions.filter((s) => {
      const dt = parseDateYMD(s.date);
      if (!dt) return false;
      return inQuarter(dt, y, q);
    });
  }, [sessions]);

  const thisHalfSessions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const half = getHalf(now.getMonth()) as 1 | 2;

    return sessions.filter((s) => {
      const dt = parseDateYMD(s.date);
      if (!dt) return false;
      return inHalf(dt, y, half);
    });
  }, [sessions]);

  const buildMemberPeriodData = (
    periodSessions: SessionSummary[],
  ): Map<string, { scoreSum: number; rows: MemberAttendanceRow[] }> => {
    const map = new Map<string, { scoreSum: number; rows: MemberAttendanceRow[] }>();

    for (const m of activeMembers) {
      map.set(m.memberId, { scoreSum: 0, rows: [] });
    }

    for (const sess of periodSessions) {
      for (const a of sess.attendees ?? []) {
        const attendeeName = String(a.name ?? '').trim();
        if (!attendeeName) continue;

        const attendeeMemberId =
          String((a as any).memberId ?? '').trim() || nameToMemberId.get(attendeeName) || '';

        if (!attendeeMemberId || !map.has(attendeeMemberId)) continue;

        const row: MemberAttendanceRow = {
          gymName: String(sess.gymName ?? '').trim(),
          date: String(sess.date ?? '').trim(),
          preregistered: String(a.preregistered ?? '').trim(),
          attendanceType: a.attendanceType,
          score: safeScore(a.score),
          writer: String(sess.writer ?? '').trim(),
        };

        const bucket = map.get(attendeeMemberId)!;
        bucket.scoreSum += row.score;
        bucket.rows.push(row);
      }
    }

    for (const [, v] of map) {
      v.rows.sort(
        (ra, rb) => (parseDateYMD(rb.date)?.getTime() ?? 0) - (parseDateYMD(ra.date)?.getTime() ?? 0),
      );
    }

    return map;
  };

  const memberQuarterData = useMemo(() => {
    return buildMemberPeriodData(thisQuarterSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisQuarterSessions, activeMembers, nameToMemberId]);

  const memberHalfData = useMemo(() => {
    return buildMemberPeriodData(thisHalfSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisHalfSessions, activeMembers, nameToMemberId]);

  const isNewbieMember = useMemo(() => {
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth() + 1;

    const map = new Map<string, boolean>();

    for (const m of activeMembers) {
      const ym = parseJoinYearMonth(m.joinDateRaw);
      if (!ym) {
        map.set(m.memberId, false);
        continue;
      }
      const diff = monthsDiff(nowY, nowM, ym.y, ym.m);
      map.set(m.memberId, diff >= 0 && diff <= 5);
    }

    return map;
  }, [activeMembers]);

  const getDisplayScore = (role: MemberCardRow['role'], quarterScore: number, halfScore: number) => {
    return role === '준회원' ? halfScore : quarterScore;
  };

  const getDisplayPeriodLabel = (role: MemberCardRow['role']): '이번분기' | '이번반기' => {
    return role === '준회원' ? '이번반기' : '이번분기';
  };

  const isUnderScoreMember = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const m of activeMembers) {
      const quarterScore = memberQuarterData.get(m.memberId)?.scoreSum ?? 0;
      const halfScore = memberHalfData.get(m.memberId)?.scoreSum ?? 0;

      if (m.role === '준회원') {
        map.set(m.memberId, halfScore < MIN_HALF_SCORE_FOR_JUNIOR);
      } else {
        const min = MIN_QUARTER_SCORE_BY_ROLE[m.role] ?? 0;
        map.set(m.memberId, quarterScore < min);
      }
    }

    return map;
  }, [activeMembers, memberQuarterData, memberHalfData]);

  const filteredCards = useMemo((): MemberCardRow[] => {
    const q = nameQuery.trim();
    const rf = roleFilter;

    const base: MemberCardRow[] = activeMembers.map((m) => {
      const quarterScore = memberQuarterData.get(m.memberId)?.scoreSum ?? 0;
      const halfScore = memberHalfData.get(m.memberId)?.scoreSum ?? 0;
      const displayScore = getDisplayScore(m.role, quarterScore, halfScore);

      return {
        memberId: m.memberId,
        name: m.name,
        role: m.role,
        joinDateRaw: m.joinDateRaw,
        quarterScore,
        halfScore,
        displayScore,
        displayPeriodLabel: getDisplayPeriodLabel(m.role),
      };
    });

    const afterFilter = base
      .filter((r) => (q ? r.name.includes(q) : true))
      .filter((r) => (rf === '전체' ? true : r.role === rf))
      .filter((r) => (onlyNewbie ? (isNewbieMember.get(r.memberId) ?? false) : true))
      .filter((r) => (onlyUnderScore ? (isUnderScoreMember.get(r.memberId) ?? false) : true));

    const afterSort = [...afterFilter].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.name.localeCompare(b.name, 'ko');
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const diff = a.displayScore - b.displayScore;
      if (diff !== 0) return sortDir === 'asc' ? diff : -diff;

      const cmp = a.name.localeCompare(b.name, 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return afterSort;
  }, [
    activeMembers,
    memberQuarterData,
    memberHalfData,
    nameQuery,
    roleFilter,
    onlyNewbie,
    onlyUnderScore,
    sortKey,
    sortDir,
    isNewbieMember,
    isUnderScoreMember,
  ]);

  const expandedMember = useMemo(() => {
    if (!expandedMemberId) return null;
    return activeMembers.find((m) => m.memberId === expandedMemberId) ?? null;
  }, [expandedMemberId, activeMembers]);

  const expandedRows = useMemo(() => {
    if (!expandedMemberId || !expandedMember) return [];
    if (expandedMember.role === '준회원') {
      return memberHalfData.get(expandedMemberId)?.rows ?? [];
    }
    return memberQuarterData.get(expandedMemberId)?.rows ?? [];
  }, [expandedMemberId, expandedMember, memberQuarterData, memberHalfData]);

  const expandedTotal = useMemo(() => {
    if (!expandedMemberId || !expandedMember) return 0;
    if (expandedMember.role === '준회원') {
      return memberHalfData.get(expandedMemberId)?.scoreSum ?? 0;
    }
    return memberQuarterData.get(expandedMemberId)?.scoreSum ?? 0;
  }, [expandedMemberId, expandedMember, memberQuarterData, memberHalfData]);

  const expandedPeriodLabel = useMemo(() => {
    if (!expandedMember) return '이번분기';
    return expandedMember.role === '준회원' ? '이번반기' : '이번분기';
  }, [expandedMember]);

  const toggleExpand = (memberId: string) => {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  const toggleSortDir = () => {
    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="space-y-3">
      {/* 헤더 영역: CardSection이 title을 담당 → 여기선 정렬 컨트롤만 */}
      <div className="flex items-center justify-end gap-2">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-fg"
        >
          <option value="name">이름순</option>
          <option value="score">점수순</option>
        </select>

        <button
          type="button"
          onClick={toggleSortDir}
          title={sortDir === 'asc' ? '오름차순' : '내림차순'}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-fg transition hover:bg-white/10 active:scale-[0.99]"
        >
          {sortDir === 'asc' ? '▲' : '▼'}
        </button>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* 이름 검색 */}
        <div className="grid gap-2">
          <label className="text-sm text-fg/70">이름 검색</label>
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-fg placeholder:text-fg/50"
          />
        </div>

        {/* Role 필터 */}
        <div className="grid gap-2">
          <label className="text-sm text-fg/70">Role 필터</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['전체', '운영진', '정회원', '준회원'] as RoleFilter[]).map((r) => {
              const active = roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={[
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition',
                    active
                      ? 'border-white/10 bg-brand/20 text-fg'
                      : 'border-white/10 bg-white/10 text-fg/70 hover:bg-white/15 hover:text-fg',
                  ].join(' ')}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* 추가 필터 */}
        <div className="grid gap-2">
          <label className="text-sm text-fg/70">추가 필터</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnlyNewbie((p) => !p)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                onlyNewbie
                  ? 'border-white/10 bg-indigo-500/20 text-fg'
                  : 'border-white/10 bg-white/10 text-fg/70 hover:bg-white/15 hover:text-fg',
              ].join(' ')}
            >
              신입(6개월)
            </button>

            <button
              type="button"
              onClick={() => setOnlyUnderScore((p) => !p)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                onlyUnderScore
                  ? 'border-white/10 bg-rose-500/20 text-fg'
                  : 'border-white/10 bg-white/10 text-fg/70 hover:bg-white/15 hover:text-fg',
              ].join(' ')}
            >
              점수 미달자
            </button>
          </div>

          <div className="text-xs text-fg/60">
            * 운영진/정회원: {MIN_QUARTER_SCORE_BY_ROLE.정회원}점 이상(분기), 준회원:{' '}
            {MIN_HALF_SCORE_FOR_JUNIOR}점 이상(반기)
          </div>
        </div>
      </div>

      {/* 상태 */}
      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-fg/70">
          불러오는 중...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 결과 */}
      {!loading && !error && (
        <div className="space-y-2">
          {filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-fg/70">
              조건에 해당하는 회원이 없습니다.
            </div>
          ) : (
            filteredCards.map((m) => {
              const expanded = expandedMemberId === m.memberId;

              return (
                <div key={m.memberId} className="rounded-2xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    className="w-full p-4 text-left transition hover:bg-white/5"
                    onClick={() => toggleExpand(m.memberId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-fg">{m.name}</div>
                          {(isNewbieMember.get(m.memberId) ?? false) && (
                            <span className="rounded-full border border-white/10 bg-indigo-500/20 px-2 py-0.5 text-xs text-fg">
                              신입
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-fg/60">{m.displayPeriodLabel}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-fg">
                          {m.role}
                        </span>
                        <span className="text-xs text-fg/60">{expanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-fg">{m.displayScore}점</div>
                      {(isUnderScoreMember.get(m.memberId) ?? false) && (
                        <span className="rounded-full border border-white/10 bg-rose-500/20 px-2 py-0.5 text-xs text-fg">
                          미달
                        </span>
                      )}
                    </div>
                  </button>

                  {expanded && expandedMember && expandedMember.memberId === m.memberId && (
                    <div className="border-t border-white/10 p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-fg">
                          {expandedMember.name} · {expandedMember.role}
                        </div>
                        <div className="text-xs text-fg/60">{expandedPeriodLabel} 출석 기록</div>
                      </div>

                      {expandedRows.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-fg/70">
                          {expandedPeriodLabel} 출석 기록이 없습니다. (0점)
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-fg/60">
                              <tr className="border-b border-white/10">
                                <th className="py-2 text-center">암장명</th>
                                <th className="py-2 text-center">날짜</th>
                                <th className="py-2 text-center">참석유형</th>
                                <th className="py-2 text-center">참석형태</th>
                                <th className="py-2 text-center">점수</th>
                                <th className="py-2 text-center">작성자</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs">
                              {expandedRows.map((r, idx) => (
                                <tr key={idx} className="border-b border-white/10">
                                  <td className="py-2 text-center text-fg">{r.gymName}</td>
                                  <td className="py-2 text-center text-fg/80">{r.date}</td>
                                  <td className="py-2 text-center text-fg/80">{r.preregistered}</td>
                                  <td className="py-2 text-center text-fg/80">{r.attendanceType}</td>
                                  <td className="py-2 text-center text-fg">{r.score}</td>
                                  <td className="py-2 text-center text-fg/80">{r.writer || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-fg">
                        {expandedPeriodLabel} 총 점수: <span className="font-semibold">{expandedTotal}</span>점
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
