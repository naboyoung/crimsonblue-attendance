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

// ✅ Members API 최소 타입
// (실제로는 members API가 camelCase로 내려줄 수도 있어서 아래에서 안전 처리함)
type Member = {
  member_id?: string;
  name?: string;
  role?: string; // 운영진/정회원/준회원/휴면/탈퇴
  is_active?: string | boolean;
  join_date?: string; // snake 가능
  joinDate?: string;  // camel 가능
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
  displayScore: number; // ✅ role 기준으로 보여줄 점수(운영진/정회원=분기, 준회원=반기)
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
// ✅ 확정 룰 반영
const MIN_QUARTER_SCORE_BY_ROLE: Record<'운영진' | '정회원', number> = {
  운영진: 3,
  정회원: 3,
};

const MIN_HALF_SCORE_FOR_JUNIOR = 4; // ✅ 준회원 반기 기준
/* ---------------------------------------------------------------------- */

/* ---------------- 유틸 ---------------- */
function parseDateYMD(d: string) {
  // 지원: "YYYY-MM-DD", "YYYY. MM. DD", "YYYY.MM.DD", "YYYY/MM/DD"
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
  // 지원: "YYYY-M", "YYYY-MM", "YYYY. M", "YYYY/MM"
  const s = String(join ?? '').trim();
  if (!s) return null;

  const normalized = s.replace(/\s+/g, '').replace(/[./]/g, '-');
  const [yStr, mStr] = normalized.split('-');

  const y = Number(yStr);
  const m = Number(mStr);

  if (!y || !m) return null;
  return { y, m }; // m: 1~12
}

function getQuarter(m0: number) {
  return Math.floor(m0 / 3) + 1;
}

function inQuarter(date: Date, y: number, q: number) {
  return date.getFullYear() === y && getQuarter(date.getMonth()) === q;
}

function getHalf(m0: number) {
  // 0~5 => 상반기(1), 6~11 => 하반기(2)
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
  // nowM/joinM: 1~12
  return nowY * 12 + nowM - (joinY * 12 + joinM);
}

function getJoinDateRaw(m: Member) {
  // ✅ join_date(스네이크) / joinDate(카멜) 둘 다 지원
  return String((m as any).join_date ?? (m as any).joinDate ?? '').trim();
}

/* ---------------- 컴포넌트 ---------------- */
export default function MemberView() {
  // 데이터
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // UI
  const [nameQuery, setNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('전체');

  // 추가 필터 토글
  const [onlyNewbie, setOnlyNewbie] = useState(false); // ✅ 신입(6개월)
  const [onlyUnderScore, setOnlyUnderScore] = useState(false); // ✅ 점수 미달자(역할별/기간별)

  // 정렬
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // 상세 펼침
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // 1) members + attendance(history) 동시 로딩
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

  // 2) 활동회원(운영진/정회원/준회원)만 리스트 기준
  const activeMembers = useMemo(() => {
    return members
      .filter((m) => isActiveTrue((m as any).is_active ?? (m as any).isActive))
      .filter((m) => isActiveRole((m as any).role))
      .map((m) => ({
        memberId: String((m as any).member_id ?? (m as any).memberId ?? '').trim(),
        name: String((m as any).name ?? '').trim(),
        role: String((m as any).role ?? '').trim() as '운영진' | '정회원' | '준회원',
        joinDateRaw: getJoinDateRaw(m), // ✅ join_date/joinDate 모두 지원
      }))
      .filter((m) => m.memberId && m.name);
  }, [members]);

  // 3) 이름->memberId 매핑(출석기록에 memberId 없을 때 fallback)
  const nameToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of activeMembers) map.set(m.name, m.memberId);
    return map;
  }, [activeMembers]);

  // 4) 이번 분기/이번 반기 세션만 추출
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

  // 5) 회원별 점수(분기/반기) + 상세 rows 계산
  const buildMemberPeriodData = (
    periodSessions: SessionSummary[],
  ): Map<string, { scoreSum: number; rows: MemberAttendanceRow[] }> => {
    const map = new Map<string, { scoreSum: number; rows: MemberAttendanceRow[] }>();

    // 활동회원 기본값
    for (const m of activeMembers) {
      map.set(m.memberId, { scoreSum: 0, rows: [] });
    }

    for (const sess of periodSessions) {
      for (const a of sess.attendees ?? []) {
        const attendeeName = String(a.name ?? '').trim();
        if (!attendeeName) continue;

        const attendeeMemberId =
          String((a as any).memberId ?? '').trim() ||
          nameToMemberId.get(attendeeName) ||
          '';

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

    // 최신순 정렬
    for (const [, v] of map) {
      v.rows.sort(
        (ra, rb) =>
          (parseDateYMD(rb.date)?.getTime() ?? 0) -
          (parseDateYMD(ra.date)?.getTime() ?? 0),
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

  // 6) 신입 판정(가입월 포함 6개월: 0~5개월)
  const isNewbieMember = useMemo(() => {
    const now = new Date();
    const nowY = now.getFullYear();
    const nowM = now.getMonth() + 1; // 1~12

    const map = new Map<string, boolean>();

    for (const m of activeMembers) {
      const ym = parseJoinYearMonth(m.joinDateRaw); // ✅ YYYY-MM 정상 처리
      if (!ym) {
        map.set(m.memberId, false);
        continue;
      }
      const diff = monthsDiff(nowY, nowM, ym.y, ym.m);
      map.set(m.memberId, diff >= 0 && diff <= 5);
    }

    return map;
  }, [activeMembers]);

  // 7) role 기준 표시 점수/미달 판정
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

  // 8) 카드 리스트 생성 + 검색/필터 + 정렬 (✅ 표시 점수 기준)
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

      // score: ✅ 표시 점수 기준 정렬
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

  // 확장된 멤버 상세: ✅ role 기준 기간의 rows 사용
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
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Member View</div>

        {/* 정렬 컨트롤 */}
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="name">이름순</option>
            <option value="score">점수순</option>
          </select>
          <button
            type="button"
            onClick={toggleSortDir}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            title={sortDir === 'asc' ? '오름차순' : '내림차순'}
          >
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 검색/필터 */}
      <section className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid gap-2">
          <label className="text-sm text-slate-600">이름 검색</label>
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        {/* Role 필터 */}
        <div className="grid gap-2">
          <label className="text-sm text-slate-600">Role 필터</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['전체', '운영진', '정회원', '준회원'] as RoleFilter[]).map((r) => {
              const active = roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={[
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold',
                    active
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700',
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
          <label className="text-sm text-slate-600">추가 필터</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnlyNewbie((p) => !p)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold',
                onlyNewbie
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-700',
              ].join(' ')}
            >
              신입(6개월)
            </button>

            <button
              type="button"
              onClick={() => setOnlyUnderScore((p) => !p)}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold',
                onlyUnderScore
                  ? 'border-rose-600 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-white text-slate-700',
              ].join(' ')}
            >
              점수 미달자
            </button>
          </div>

          <div className="text-xs text-slate-500">
            * 운영진/정회원: {MIN_QUARTER_SCORE_BY_ROLE.정회원}점 이상(분기), 준회원: {MIN_HALF_SCORE_FOR_JUNIOR}점 이상(반기)
          </div>
        </div>
      </section>

      {/* 로딩/에러 */}
      {loading && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          불러오는 중...
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 리스트 */}
      {!loading && !error && (
        <section className="space-y-2">
          {filteredCards.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
              조건에 해당하는 회원이 없습니다.
            </div>
          ) : (
            filteredCards.map((m) => {
              const expanded = expandedMemberId === m.memberId;

              return (
                <div key={m.memberId} className="rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="w-full text-left p-4"
                    onClick={() => toggleExpand(m.memberId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.displayPeriodLabel}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          {m.role}
                        </span>
                        <span className="text-xs text-slate-600">{expanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">{m.displayScore}점</div>

                      <div className="flex items-center gap-2">
                        {(isNewbieMember.get(m.memberId) ?? false) && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                            신입
                          </span>
                        )}
                        {(isUnderScoreMember.get(m.memberId) ?? false) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            미달
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* 상세 */}
                  {expanded && expandedMember && expandedMember.memberId === m.memberId && (
                    <div className="border-t border-slate-200 p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {expandedMember.name} · {expandedMember.role}
                        </div>
                        <div className="text-xs text-slate-500">{expandedPeriodLabel} 출석 기록</div>
                      </div>

                      {expandedRows.length === 0 ? (
                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          {expandedPeriodLabel} 출석 기록이 없습니다. (0점)
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-500">
                              <tr className="border-b border-slate-200">
                                <th className="py-2 pr-2">암장명</th>
                                <th className="py-2 pr-2">날짜</th>
                                <th className="py-2 pr-2">참석유형</th>
                                <th className="py-2 pr-2">참석형태</th>
                                <th className="py-2 pr-2 text-right">점수</th>
                                <th className="py-2 pr-2">작성자</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedRows.map((r, idx) => (
                                <tr key={idx} className="border-b border-slate-100">
                                  <td className="py-2 pr-2 text-slate-900">{r.gymName}</td>
                                  <td className="py-2 pr-2 text-slate-700">{r.date}</td>
                                  <td className="py-2 pr-2 text-slate-700">{r.preregistered}</td>
                                  <td className="py-2 pr-2 text-slate-700">{r.attendanceType}</td>
                                  <td className="py-2 pr-2 text-right text-slate-900">{r.score}</td>
                                  <td className="py-2 pr-2 text-slate-700">{r.writer || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                        {expandedPeriodLabel} 총 점수: <span className="font-semibold">{expandedTotal}</span>점
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
