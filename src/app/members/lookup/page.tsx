'use client';

import { useEffect, useMemo, useState } from 'react';
import MobileHeader from '@/components/layout/MobileHeader';

type Role = '운영진' | '정회원' | '준회원' | '휴면' | '탈퇴';
type RoleFilter = '선택안함' | Role | '신입';

type Member = {
  member_id: string;
  name: string;
  role: Role;
  is_active: boolean;

  school: string;
  gender: string;
  birth_year: string;
  phone_number: string;
  region: string;
  level: string;

  join_date: string; // YYYY-MM
  last_updated_at: string; // YYYY-MM-DD HH:mm:ss
  comment: string;
};

function isNewMember(joinDate: string) {
  // joinDate: YYYY-MM
  const [y, m] = joinDate.split('-').map(Number);
  if (!y || !m) return false;

  const join = new Date(y, m - 1, 1);
  const now = new Date();

  const diffMonths =
    (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());

  return diffMonths < 6;
}

export default function MemberLookupPage() {
  const [nameQuery, setNameQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('선택안함');

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // ✅ 확장: 토스트(간단)
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 🔹 Members 로드(초기 노출은 하지 않음)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/members', { cache: 'no-store' });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.ok) {
          setMembers([]);
          setError(json?.message ?? '회원 정보를 불러오지 못했습니다.');
          return;
        }

        setMembers(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        setMembers([]);
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ✅ 조건이 하나라도 있어야 결과 노출
  const hasCondition = nameQuery.trim() !== '' || roleFilter !== '선택안함';

  // ✅ 확장: "초기화 버튼 활성화" 조건(Dirty check)
  const isDirty = nameQuery.trim() !== '' || roleFilter !== '선택안함' || selectedId !== null;

  const handleReset = () => {
    setNameQuery('');
    setRoleFilter('선택안함');
    setSelectedId(null);
    setToast('초기화되었습니다.');
  };

  const filteredMembers = useMemo(() => {
    if (!hasCondition) return [];

    const q = nameQuery.trim();

    return members.filter((m) => {
      if (q && !m.name.includes(q)) return false;

      if (roleFilter === '신입') return isNewMember(m.join_date);

      if (roleFilter !== '선택안함' && m.role !== roleFilter) return false;

      return true;
    });
  }, [members, nameQuery, roleFilter, hasCondition]);

  return (
    <div className="min-h-dvh bg-white">
      <MobileHeader title="회원정보 조회" backHref="/" />

      <main className="p-4 space-y-4">
        {/* ✅ 토스트 */}
        {toast && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow">
            {toast}
          </div>
        )}

        {/* 상단: 검색/필터 + 초기화 */}
        <section className="rounded-xl border border-slate-200 p-3 space-y-3">
          <div>
            <div className="text-sm font-semibold">이름 검색</div>
            <input
              value={nameQuery}
              onChange={(e) => {
                setNameQuery(e.target.value);
                setSelectedId(null); // ✅ 조건 변경 시 상세 닫기
              }}
              placeholder="이름으로 검색"
              className="mt-2 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">role 필터</div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                setSelectedId(null); // ✅ 조건 변경 시 상세 닫기
              }}
              className="mt-1 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
            >
              <option value="선택안함">선택안함</option>
              <option value="운영진">운영진</option>
              <option value="정회원">정회원</option>
              <option value="준회원">준회원</option>
              <option value="신입">신입</option>
              <option value="휴면">휴면</option>
              <option value="탈퇴">탈퇴</option>
            </select>
          </div>

          {/* ✅ 확장: 초기화 버튼 (Dirty일 때만 활성화) */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty}
            className={[
              'w-full h-11 rounded-md border text-sm font-semibold active:scale-[0.99] transition',
              isDirty
                ? 'border-slate-200 bg-slate-50 text-slate-800'
                : 'border-slate-100 bg-slate-100 text-slate-400',
            ].join(' ')}
            aria-disabled={!isDirty}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <span aria-hidden>↺</span>
              초기화
            </span>
          </button>

          {/* 로딩/에러 (상단에 짧게) */}
          {loading && <div className="text-xs text-slate-500">불러오는 중…</div>}
          {error && <div className="text-xs text-red-600">{error}</div>}
        </section>

        {/* 디폴트: 빈 화면 */}
        {!hasCondition && (
          <div className="text-sm text-slate-500 text-center py-8">
            검색 조건을 입력하세요.
          </div>
        )}

        {/* 결과 없음 */}
        {hasCondition && !loading && !error && filteredMembers.length === 0 && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
            검색 결과가 없습니다.
          </div>
        )}

        {/* 리스트 */}
        {hasCondition &&
          filteredMembers.map((m) => {
            const expanded = selectedId === m.member_id;

            return (
              <div key={m.member_id} className="rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedId(expanded ? null : m.member_id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    {/* 좌측 */}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{m.phone_number}</div>
                    </div>

                    {/* 우측 */}
                    <div className="shrink-0 text-right space-y-1">
                      {/* role 뱃지 */}
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {m.role}
                      </span>

                      {/* school/level 뱃지 */}
                      <div className="flex gap-1 justify-end">
                        <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                          {m.school}
                        </span>
                        <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                          {m.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* 상세: 카드 바로 아래 */}
                {expanded && (
                  <div className="border-t border-slate-200 p-4 space-y-2">
                    <div className="text-sm text-slate-800">
                      {m.gender} · {m.birth_year} · {m.region}
                    </div>

                    <div className="text-xs text-slate-600">
                      가입: {m.join_date} / 업데이트: {m.last_updated_at}
                    </div>

                    <div className="text-xs text-slate-600">
                      비고: {m.comment || '-'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </main>
    </div>
  );
}
