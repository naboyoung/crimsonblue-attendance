'use client';

import { useEffect, useMemo, useState } from 'react';
import { FIELD_BASE, cx } from '@/components/ui/fieldStyles';
import Segmented from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';

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

type RoleFilter = '전체' | '운영진' | '정회원' | '준회원' | 'OB';

export type SortKey = 'name' | 'score';
export type SortDir = 'asc' | 'desc';

type MemberCardRow = {
  memberId: string;
  name: string;
  role: '운영진' | '정회원' | '준회원' | 'OB';
  joinDateRaw: string; // join_date/joinDate 원본 (신입 판정용)
  quarterScore: number;
  halfScore: number;
  displayScore: number;
  displayPeriodLabel: '이번분기' | '이번반기';
  gymCount: number; // 방문 암장 수(표시기간 기준)
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
const MIN_QUARTER_SCORE = 4; // 운영진/정회원/준회원 분기
const MIN_HALF_SCORE_OB = 6; // OB 반기
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

function formatDateDisplay(d: string) {
  const dt = parseDateYMD(d);
  if (!dt) return String(d ?? '').trim();

  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
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
  return r === '운영진' || r === '정회원' || r === '준회원' || r === 'OB';
}

function monthsDiff(nowY: number, nowM: number, joinY: number, joinM: number) {
  return nowY * 12 + nowM - (joinY * 12 + joinM);
}

function getJoinDateRaw(m: Member) {
  return String((m as any).join_date ?? (m as any).joinDate ?? '').trim();
}

/* ---------------- Props ---------------- */
type MemberViewProps = {
  initialSortKey?: SortKey;
  initialSortDir?: SortDir;
};

export default function MemberView({ initialSortKey = 'name', initialSortDir = 'asc' }: MemberViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [nameQuery, setNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('전체');

  const [onlyNewbie, setOnlyNewbie] = useState(false);
  const [onlyUnderScore, setOnlyUnderScore] = useState(false);

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const toggleSortDir = () => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));

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
        role: String((m as any).role ?? '').trim() as '운영진' | '정회원' | '준회원' | 'OB',
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

        const attendeeMemberId = String((a as any).memberId ?? '').trim() || nameToMemberId.get(attendeeName) || '';
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
      v.rows.sort((ra, rb) => (parseDateYMD(rb.date)?.getTime() ?? 0) - (parseDateYMD(ra.date)?.getTime() ?? 0));
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
    return role === 'OB' ? halfScore : quarterScore;
  };

  const getDisplayPeriodLabel = (role: MemberCardRow['role']): '이번분기' | '이번반기' => {
    return role === 'OB' ? '이번반기' : '이번분기';
  };

  const isUnderScoreMember = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const m of activeMembers) {
      const quarterScore = memberQuarterData.get(m.memberId)?.scoreSum ?? 0;
      const halfScore = memberHalfData.get(m.memberId)?.scoreSum ?? 0;

      if (m.role === 'OB') {
        map.set(m.memberId, halfScore < MIN_HALF_SCORE_OB);
      } else {
        map.set(m.memberId, quarterScore < MIN_QUARTER_SCORE);
      }
    }

    return map;
  }, [activeMembers, memberQuarterData, memberHalfData]);

  const filteredCards = useMemo((): MemberCardRow[] => {
    const q = nameQuery.trim();
    const rf = roleFilter;

    const base: MemberCardRow[] = activeMembers.map((m) => {
      const quarterBucket = memberQuarterData.get(m.memberId);
      const halfBucket = memberHalfData.get(m.memberId);

      const quarterScore = quarterBucket?.scoreSum ?? 0;
      const halfScore = halfBucket?.scoreSum ?? 0;

      const displayScore = getDisplayScore(m.role, quarterScore, halfScore);

      const displayRows = m.role === 'OB' ? (halfBucket?.rows ?? []) : (quarterBucket?.rows ?? []);
      const gymCount = new Set(displayRows.map((r) => String(r.gymName ?? '').trim()).filter(Boolean)).size;

      return {
        memberId: m.memberId,
        name: m.name,
        role: m.role,
        joinDateRaw: m.joinDateRaw,
        quarterScore,
        halfScore,
        displayScore,
        displayPeriodLabel: getDisplayPeriodLabel(m.role),
        gymCount,
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
    if (expandedMember.role === 'OB') return memberHalfData.get(expandedMemberId)?.rows ?? [];
    return memberQuarterData.get(expandedMemberId)?.rows ?? [];
  }, [expandedMemberId, expandedMember, memberQuarterData, memberHalfData]);

  const expandedTotal = useMemo(() => {
    if (!expandedMemberId || !expandedMember) return 0;
    if (expandedMember.role === 'OB') return memberHalfData.get(expandedMemberId)?.scoreSum ?? 0;
    return memberQuarterData.get(expandedMemberId)?.scoreSum ?? 0;
  }, [expandedMemberId, expandedMember, memberQuarterData, memberHalfData]);

  const expandedPeriodLabel = useMemo(() => {
    if (!expandedMember) return '이번분기';
    return expandedMember.role === 'OB' ? '이번반기' : '이번분기';
  }, [expandedMember]);

  const toggleExpand = (memberId: string) => {
    setExpandedMemberId((prev) => {
      const next = prev === memberId ? null : memberId;
      setShowAllLogs(false);
      return next;
    });
  };

  /* ---------------- 라이트 톤 배지 ---------------- */
  const badgeBase = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';
  const badgeRole = `${badgeBase} border-slate-200 bg-white text-slate-800`;
  const badgeNewbie = `${badgeBase} border-slate-200 bg-indigo-50 text-indigo-700`;
  const badgeUnder = `${badgeBase} border-slate-200 bg-rose-50 text-rose-700`;

  const selectClass =
    'rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200';

  const sortDirBtnClass =
    'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.99]';

  const helperTextClass = 'text-xs text-slate-500';

  return (
    <div className="space-y-3">
      {/* 이름 검색 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">이름 검색</label>
        <input
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="이름을 입력하세요"
          className={cx(FIELD_BASE)}
          autoComplete="off"
        />
      </div>

      {/* 필터/정렬 */}
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">회원 등급 (택1)</label>
          <Segmented<RoleFilter>
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: '전체', label: '전체' },
              { value: '운영진', label: '운영진' },
              { value: '정회원', label: '정회원' },
              { value: '준회원', label: '준회원' },
              { value: 'OB', label: 'OB' },
            ]}
          />
        </div>

        <div className="h-px w-full bg-slate-200" />

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">추가 필터</label>

          <Segmented<'신입(6개월)' | '점수 미달자'>
            mode="multi"
            value={[
              ...(onlyNewbie ? (['신입(6개월)'] as const) : []),
              ...(onlyUnderScore ? (['점수 미달자'] as const) : []),
            ]}
            onChange={(next) => {
              setOnlyNewbie(next.includes('신입(6개월)'));
              setOnlyUnderScore(next.includes('점수 미달자'));
            }}
            options={[
              { value: '신입(6개월)', label: '신입(6개월)' },
              { value: '점수 미달자', label: '점수 미달자' },
            ]}
          />

          <div className={helperTextClass}>
            * 운영진/정회원/준회원: {MIN_QUARTER_SCORE}점 이상(분기), OB: {MIN_HALF_SCORE_OB}점 이상(반기)
          </div>
        </div>

        {/* 정렬 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">정렬</span>

            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={selectClass}>
              <option value="name">이름순</option>
              <option value="score">점수순</option>
            </select>
          </div>

          <button type="button" onClick={toggleSortDir} title={sortDir === 'asc' ? '오름차순' : '내림차순'} className={sortDirBtnClass}>
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <div className="max-h-[58vh] overflow-auto pr-1">
          {filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">조건에 해당하는 회원이 없습니다.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200">
                {filteredCards.map((m) => {
                  const expanded = expandedMemberId === m.memberId;
                  const newbie = isNewbieMember.get(m.memberId) ?? false;
                  const under = isUnderScoreMember.get(m.memberId) ?? false;

                  return (
                    <div key={m.memberId}>
                      <button
                        type="button"
                        className={['w-full p-4 text-left transition', expanded ? 'bg-slate-50' : 'hover:bg-slate-50'].join(' ')}
                        onClick={() => toggleExpand(m.memberId)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                              {newbie && <span className={badgeNewbie}>신입</span>}
                            </div>

                            <div className="text-xs text-slate-500">
                              {m.displayPeriodLabel} · 방문 암장 {m.gymCount}곳
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={badgeRole}>{m.role}</span>
                            <span className="text-xs text-slate-500">{expanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">{m.displayScore}점</div>
                          {under && <span className={badgeUnder}>미달</span>}
                        </div>
                      </button>

                      {expanded && expandedMember && expandedMember.memberId === m.memberId && (
                        <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4">


                          {expandedRows.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                              {expandedPeriodLabel} 출석 기록이 없습니다. (0점)
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {(() => {
                                const LOG_PREVIEW_LIMIT = 10;
                                const visibleRows = showAllLogs ? expandedRows : expandedRows.slice(0, LOG_PREVIEW_LIMIT);
                                const hasMore = expandedRows.length > LOG_PREVIEW_LIMIT;

                                return (
                                  <>
                                    {visibleRows.map((r, idx) => {
                                      const score = r.score ?? 0;
                                      const scoreText = score > 0 ? `+${score}` : `${score}`;

                                      const secondary = [
                                        formatDateDisplay(r.date),
                                        String(r.preregistered ?? '').trim(),
                                        String(r.attendanceType ?? '').trim(),
                                        r.writer ? `작성자: ${String(r.writer).trim()}` : '',
                                      ]
                                        .filter(Boolean)
                                        .join(' · ');

                                      return (
                                        <div key={`${r.gymName}-${r.date}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="text-sm font-semibold text-slate-900">{r.gymName}</div>
                                            <div className="shrink-0 text-sm font-semibold text-slate-900">{scoreText}</div>
                                          </div>

                                          <div className="mt-1 text-xs text-slate-500">{secondary}</div>
                                        </div>
                                      );
                                    })}

                                    {hasMore && !showAllLogs && (
                                      <button
                                        type="button"
                                        onClick={() => setShowAllLogs(true)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                      >
                                        더보기 ({expandedRows.length - LOG_PREVIEW_LIMIT}개)
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900">
                            {expandedPeriodLabel} 총 점수: <span className="font-semibold">{expandedTotal}</span>점
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
