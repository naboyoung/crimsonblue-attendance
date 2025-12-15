'use client';

import { useEffect, useMemo, useState } from 'react';
import MobileHeader from '@/components/layout/MobileHeader';

type Role = '운영진' | '정회원' | '준회원' | '휴면' | '탈퇴';

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

type WorkMode = 'ROLE_STATUS' | 'PROFILE_EDIT';

type RoleStatusAction =
  | 'PROMOTE_TO_STAFF'
  | 'DEMOTE_FROM_STAFF'
  | 'SET_DORMANT'
  | 'UNSET_DORMANT_TO_REGULAR'
  | 'SET_WITHDRAWN'
  | 'SET_ASSOCIATE'
  | 'UNSET_ASSOCIATE_TO_REGULAR';

type ProfileEditAction = 'UPDATE_PHONE' | 'UPDATE_REGION' | 'UPDATE_LEVEL';

type PendingChange = {
  kind: 'ROLE_STATUS' | 'PROFILE_EDIT' | 'NEW_MEMBER';
  item: string;
  targetMemberIds: string[];
  previewLines: string[];
  // ✅ 추가: API 호출에 필요한 최소 데이터 보관
  action?: RoleStatusAction | ProfileEditAction | 'NEW_MEMBER';
  newValue?: string;
};

export default function MemberManagePage() {
  // =========================
  // ✅ STEP2: 더미 데이터 제거 → Members API에서 로드
  // =========================
  const [allMembers, setAllMembers] = useState<Member[]>([]); // ✅ 변경
  const [loading, setLoading] = useState(false); // ✅ 추가
  const [error, setError] = useState(''); // ✅ 추가

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/members', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setError(json?.message ?? 'Members를 불러오지 못했습니다.');
          setAllMembers([]);
          return;
        }
        // members API가 json.data로 내려준다고 했던 흐름을 그대로 사용
        setAllMembers(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
        setAllMembers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // =========================
  // 상단: 검색/필터
  // =========================
  const [nameQuery, setNameQuery] = useState('');

  // 필터 항목(2줄)
  const [filterStaff, setFilterStaff] = useState(true);
  const [filterRegular, setFilterRegular] = useState(true);
  const [filterAssociate, setFilterAssociate] = useState(true);

  const [filterDormant, setFilterDormant] = useState(false); // 휴면 유저
  const [filterLowScore, setFilterLowScore] = useState(false); // 점수 미달자(조건 추후)

  // =========================
  // 대상자 선택
  // =========================
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // =========================
  // 작업 모드
  // =========================
  const [workMode, setWorkMode] = useState<WorkMode>('ROLE_STATUS');

  // 등급/상태변경
  const [roleStatusAction, setRoleStatusAction] = useState<RoleStatusAction>('SET_DORMANT');

  // 개인정보수정
  const [profileEditAction, setProfileEditAction] = useState<ProfileEditAction>('UPDATE_PHONE');
  const [profileNewValue, setProfileNewValue] = useState('');

  // =========================
  // 최종확인 모달(공통)
  // =========================
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [changedBy, setChangedBy] = useState('');

  // ✅ STEP2: 최종 반영 중 상태
  const [submitting, setSubmitting] = useState(false); // ✅ 추가

  // =========================
  // 신입등록 모달
  // =========================
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  // ✅ 신입등록: role 기본값 '정회원'
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    role: '정회원' as Role,
    school: '연세대',
    gender: '남',
    birth_year: '',
    phone_number: '',
    region: '',
    level: '입문',
    join_date: '',
    comment: '',
  });

  // =========================
  // 점수 미달자(더미) - 조건은 추후 확정
  // =========================
  const lowScoreMemberIdSet = useMemo(() => {
    // TODO: (추후) AttendanceHistory + ScoreRule 기반으로 계산
    return new Set(allMembers.filter((m) => m.role === '준회원').map((m) => m.member_id));
  }, [allMembers]);

  // =========================
  // 필터 적용 결과 리스트
  // =========================
  const filteredMembers = useMemo(() => {
    const q = nameQuery.trim();

    // 1) 이름 검색
    const base = allMembers.filter((m) => {
      if (q && !m.name.includes(q)) return false;
      return true;
    });

    // 2) 필터(선택된 것들 union)
    const anyFilterSelected =
      filterStaff || filterRegular || filterAssociate || filterDormant || filterLowScore;

    if (!anyFilterSelected) return base;

    const allowedRoles = new Set<Role>();
    if (filterStaff) allowedRoles.add('운영진');
    if (filterRegular) allowedRoles.add('정회원');
    if (filterAssociate) allowedRoles.add('준회원');
    if (filterDormant) allowedRoles.add('휴면');

    return base.filter((m) => {
      if (allowedRoles.has(m.role)) return true;
      if (filterLowScore && lowScoreMemberIdSet.has(m.member_id)) return true;
      return false;
    });
  }, [
    allMembers,
    nameQuery,
    filterStaff,
    filterRegular,
    filterAssociate,
    filterDormant,
    filterLowScore,
    lowScoreMemberIdSet,
  ]);

  const selectedMembers = useMemo(() => {
    return allMembers.filter((m) => selectedIds.has(m.member_id));
  }, [allMembers, selectedIds]);

  const selectedCount = selectedIds.size;

  // 개인정보 수정은 1명만 가능
  const canProfileEdit = selectedCount === 1;
  const selectedSingleMember = useMemo(() => {
    if (selectedCount !== 1) return null;
    const onlyId = Array.from(selectedIds)[0];
    return allMembers.find((m) => m.member_id === onlyId) ?? null;
  }, [selectedIds, selectedCount, allMembers]);

  // =========================
  // "상황별 등급/상태변경 옵션 제한"
  // =========================
  const filterContext = useMemo<'DORMANT_ONLY' | 'LOW_SCORE_ONLY' | 'DEFAULT'>(() => {
    const activeRolesSelected = filterStaff || filterRegular || filterAssociate;
    const onlyDormant = filterDormant && !filterLowScore && !activeRolesSelected;
    const onlyLowScore = filterLowScore && !filterDormant && !activeRolesSelected;

    if (onlyDormant) return 'DORMANT_ONLY';
    if (onlyLowScore) return 'LOW_SCORE_ONLY';
    return 'DEFAULT';
  }, [filterStaff, filterRegular, filterAssociate, filterDormant, filterLowScore]);

  const allowedRoleStatusActions = useMemo<RoleStatusAction[]>(() => {
    if (filterContext === 'DORMANT_ONLY') {
      return ['UNSET_DORMANT_TO_REGULAR', 'SET_WITHDRAWN'];
    }
    if (filterContext === 'LOW_SCORE_ONLY') {
      return ['SET_DORMANT', 'SET_WITHDRAWN'];
    }
    return [
      'PROMOTE_TO_STAFF',
      'DEMOTE_FROM_STAFF',
      'SET_ASSOCIATE',
      'UNSET_ASSOCIATE_TO_REGULAR',
      'SET_DORMANT',
      'UNSET_DORMANT_TO_REGULAR',
      'SET_WITHDRAWN',
    ];
  }, [filterContext]);

  useEffect(() => {
    if (!allowedRoleStatusActions.includes(roleStatusAction)) {
      setRoleStatusAction(allowedRoleStatusActions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedRoleStatusActions]);

  // =========================
  // 핸들러
  // =========================
  const resetSelection = () => setSelectedIds(new Set());

  const toggleSelect = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const selectAllFiltered = () => setSelectedIds(new Set(filteredMembers.map((m) => m.member_id)));
  const clearAll = () => setSelectedIds(new Set());

  const openConfirm = (change: PendingChange) => {
    setPendingChange(change);
    setChangedBy('');
    setConfirmOpen(true);
  };

  const buildRoleStatusPreview = (): PendingChange | null => {
    if (selectedCount === 0) return null;

    const targets = Array.from(selectedIds);
    const targetNames = selectedMembers.map((m) => `${m.name}(${m.role})`);
    const actionLabel = getRoleStatusActionLabel(roleStatusAction);

    return {
      kind: 'ROLE_STATUS',
      item: actionLabel,
      targetMemberIds: targets,
      previewLines: [
        `작업: ${actionLabel}`,
        `대상: ${targetNames.join(', ')}`,
        `현재 필터 컨텍스트: ${filterContext}`,
      ],
      action: roleStatusAction, // ✅ 추가
    };
  };

  const buildProfileEditPreview = (): PendingChange | null => {
    if (!canProfileEdit || !selectedSingleMember) return null;
    const nv = profileNewValue.trim();
    if (!nv) return null;

    const actionLabel = getProfileEditActionLabel(profileEditAction);
    const oldValue = getOldValueForProfileAction(selectedSingleMember, profileEditAction);

    return {
      kind: 'PROFILE_EDIT',
      item: actionLabel,
      targetMemberIds: [selectedSingleMember.member_id],
      previewLines: [
        `작업: ${actionLabel}`,
        `대상: ${selectedSingleMember.name}(${selectedSingleMember.role})`,
        `변경: ${oldValue} → ${nv}`,
      ],
      action: profileEditAction, // ✅ 추가
      newValue: nv, // ✅ 추가
    };
  };

  const buildNewMemberPreview = (): PendingChange | null => {
    const nm = newMemberForm.name.trim();
    if (!nm) return null;

    return {
      kind: 'NEW_MEMBER',
      item: '신입 등록',
      targetMemberIds: [],
      previewLines: [
        '작업: 신입 등록',
        `이름: ${nm}`,
        `role: ${newMemberForm.role}`,
        `학교: ${newMemberForm.school || '-'}`,
        `성별: ${newMemberForm.gender || '-'}`,
        `출생년도: ${newMemberForm.birth_year || '-'}`,
        `레벨: ${newMemberForm.level || '-'}`,
        `연락처: ${newMemberForm.phone_number || '-'}`,
        `가입연월: ${newMemberForm.join_date || '-'}`,
        `지역: ${newMemberForm.region || '-'}`,
        `비고: ${newMemberForm.comment || '-'}`,
      ],
      action: 'NEW_MEMBER', // ✅ 추가
      newValue: JSON.stringify(newMemberForm), // ✅ 추가: API에서 파싱해서 처리
    };
  };

  // =========================
  // ✅ STEP2: 최종 확인 → 실제 API 호출로 반영
  // =========================
  const handleConfirmSubmit = async () => {
    if (!pendingChange) return;

    const writer = changedBy.trim();
    if (!writer) return;

    setSubmitting(true);

    try {
      // ✅ API payload 구성
      const body = {
        kind: pendingChange.kind,
        action: pendingChange.action,
        memberIds: pendingChange.targetMemberIds,
        newValue: pendingChange.newValue ?? '',
        changedBy: writer,
      };

      const res = await fetch('/api/members/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        alert(json?.message ?? '회원정보 반영 중 오류가 발생했습니다.');
        return;
      }

      // ✅ 성공: UI 상태 정리 + members 재로딩(간단히 다시 fetch)
      alert('✅ 변경이 반영되었습니다.');

      setConfirmOpen(false);
      setPendingChange(null);
      setChangedBy('');
      setProfileNewValue('');
      setNewMemberOpen(false);

      // ✅ 선택 해제 (원하면 유지해도 되는데, 보통은 초기화가 UX 좋음)
      setSelectedIds(new Set());

      // ✅ Members 다시 불러오기
      setLoading(true);
      setError('');
      const r2 = await fetch('/api/members', { cache: 'no-store' });
      const j2 = await r2.json().catch(() => null);
      if (r2.ok && j2?.ok && Array.isArray(j2.data)) {
        setAllMembers(j2.data);
      } else {
        // 반영은 됐을 수 있으니, 여기서는 조용히 넘어가고 필요 시 새로고침 유도 가능
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-dvh bg-white">
      <MobileHeader title="회원정보 관리" backHref="/" />

      <main className="p-4 space-y-4">
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

        {/* 상단 우측: 신입 등록 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-700">
            선택됨: <span className="font-semibold">{selectedCount}</span>명
          </div>
          <button
            type="button"
            onClick={() => setNewMemberOpen(true)}
            className="h-10 px-3 rounded-md bg-slate-900 text-white text-sm font-semibold"
          >
            신입 등록
          </button>
        </div>

        {/* 1) 검색/필터 */}
        <section className="rounded-xl border border-slate-200 p-3 space-y-3">
          <div>
            <div className="text-sm font-semibold">이름 검색</div>
            <input
              value={nameQuery}
              onChange={(e) => {
                setNameQuery(e.target.value);
                resetSelection();
              }}
              placeholder="이름으로 검색"
              className="mt-2 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">필터</div>

            {/* 2줄 배치 */}
            <div className="grid grid-cols-3 gap-2">
              <CheckboxPill
                checked={filterStaff}
                label="운영진"
                onChange={() => {
                  setFilterStaff((v) => !v);
                  resetSelection();
                }}
              />
              <CheckboxPill
                checked={filterRegular}
                label="정회원"
                onChange={() => {
                  setFilterRegular((v) => !v);
                  resetSelection();
                }}
              />
              <CheckboxPill
                checked={filterAssociate}
                label="준회원"
                onChange={() => {
                  setFilterAssociate((v) => !v);
                  resetSelection();
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CheckboxPill
                checked={filterDormant}
                label="휴면 유저"
                onChange={() => {
                  setFilterDormant((v) => !v);
                  resetSelection();
                }}
              />
              <CheckboxPill
                checked={filterLowScore}
                label="점수 미달자"
                onChange={() => {
                  setFilterLowScore((v) => !v);
                  resetSelection();
                }}
              />
            </div>

            <p className="text-xs text-slate-500">
              * “점수 미달자” 조건은 추후 확정됩니다(현재는 예시).
            </p>
          </div>
        </section>

        {/* 1-3) 대상자 리스트 + 선택 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">대상자 리스트</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-9 px-3 rounded-md border border-slate-200 text-sm"
                onClick={selectAllFiltered}
                disabled={filteredMembers.length === 0}
              >
                전체선택
              </button>
              <button
                type="button"
                className="h-9 px-3 rounded-md border border-slate-200 text-sm"
                onClick={clearAll}
                disabled={selectedCount === 0}
              >
                선택해제
              </button>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
              조건에 맞는 대상자가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((m) => (
                <label
                  key={m.member_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.member_id)}
                      onChange={() => toggleSelect(m.member_id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{m.name}</div>
                      <div className="text-xs text-slate-500">
                        {m.role} · {m.phone_number}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 shrink-0">
                    {m.school} · {m.level}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* 2) 작업 종류 선택 */}
        <section className="rounded-xl border border-slate-200 p-3 space-y-3">
          <div className="text-sm font-semibold">작업 종류</div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWorkMode('ROLE_STATUS')}
              className={[
                'h-10 rounded-md text-sm font-semibold border',
                workMode === 'ROLE_STATUS'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200',
              ].join(' ')}
            >
              등급/상태변경
            </button>

            <button
              type="button"
              onClick={() => setWorkMode('PROFILE_EDIT')}
              className={[
                'h-10 rounded-md text-sm font-semibold border',
                workMode === 'PROFILE_EDIT'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200',
              ].join(' ')}
            >
              개인정보수정
            </button>
          </div>

          {workMode === 'PROFILE_EDIT' && selectedCount !== 1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              개인정보수정은 <span className="font-semibold">1명만 선택</span> 가능해요.
            </div>
          )}
        </section>

        {/* 3) 작업 UI */}
        {workMode === 'ROLE_STATUS' && (
          <section className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">등급/상태변경</div>
              <div className="text-[11px] text-slate-500">컨텍스트: {filterContext}</div>
            </div>

            <select
              value={roleStatusAction}
              onChange={(e) => setRoleStatusAction(e.target.value as RoleStatusAction)}
              className="w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
            >
              {allowedRoleStatusActions.map((action) => (
                <option key={action} value={action}>
                  {getRoleStatusActionLabel(action)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={[
                'w-full h-11 rounded-md text-sm font-semibold',
                selectedCount === 0 ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white',
              ].join(' ')}
              disabled={selectedCount === 0}
              onClick={() => {
                const preview = buildRoleStatusPreview();
                if (!preview) return;
                openConfirm(preview);
              }}
            >
              변경하기
            </button>

            <p className="text-xs text-slate-500">
              * 필터 상황에 따라 가능한 작업만 표시됩니다.
            </p>
          </section>
        )}

        {workMode === 'PROFILE_EDIT' && (
          <section className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="text-sm font-semibold">개인정보수정</div>

            <div className="grid grid-cols-3 gap-2">
              <SmallButton
                active={profileEditAction === 'UPDATE_PHONE'}
                label="연락처"
                disabled={!canProfileEdit}
                onClick={() => setProfileEditAction('UPDATE_PHONE')}
              />
              <SmallButton
                active={profileEditAction === 'UPDATE_REGION'}
                label="지역"
                disabled={!canProfileEdit}
                onClick={() => setProfileEditAction('UPDATE_REGION')}
              />
              <SmallButton
                active={profileEditAction === 'UPDATE_LEVEL'}
                label="레벨"
                disabled={!canProfileEdit}
                onClick={() => setProfileEditAction('UPDATE_LEVEL')}
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs text-slate-500">선택된 회원</div>
              <div className="mt-1 text-sm font-semibold">
                {selectedSingleMember ? `${selectedSingleMember.name} (${selectedSingleMember.role})` : '-'}
              </div>

              <div className="mt-3 text-xs text-slate-500">새 값 입력</div>
              <input
                value={profileNewValue}
                onChange={(e) => setProfileNewValue(e.target.value)}
                placeholder="새 값을 입력하세요"
                className="mt-1 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
                disabled={!canProfileEdit}
              />

              <button
                type="button"
                className={[
                  'mt-3 w-full h-11 rounded-md text-sm font-semibold',
                  !canProfileEdit || !profileNewValue.trim()
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-slate-900 text-white',
                ].join(' ')}
                disabled={!canProfileEdit || !profileNewValue.trim()}
                onClick={() => {
                  const preview = buildProfileEditPreview();
                  if (!preview) return;
                  openConfirm(preview);
                }}
              >
                변경하기
              </button>
            </div>

            <p className="text-xs text-slate-500">
              * 입력값 검증(연락처 포맷 등)은 필요하면 다음 단계에서 추가합니다.
            </p>
          </section>
        )}
      </main>

      {/* 최종 확인 모달 */}
      {confirmOpen && pendingChange && (
        <Modal onClose={() => setConfirmOpen(false)} title="최종 확인">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold">변경 내용 요약</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {pendingChange.previewLines.map((line, idx) => (
                  <li key={idx}>• {line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold">작성자명(필수)</div>
              <input
                value={changedBy}
                onChange={(e) => setChangedBy(e.target.value)}
                placeholder="작성자명을 입력하세요(운영진)"
                className="mt-2 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              변경 후에는 되돌리기 어렵습니다. 최종 확인 후 진행해주세요.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 h-11 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="button"
                className={[
                  'flex-1 h-11 rounded-md text-sm font-semibold',
                  changedBy.trim() && !submitting
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-500',
                ].join(' ')}
                disabled={!changedBy.trim() || submitting}
                onClick={handleConfirmSubmit}
              >
                {submitting ? '반영 중...' : '확인'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 신입 등록 모달 */}
      {newMemberOpen && (
        <Modal onClose={() => setNewMemberOpen(false)} title="신입 등록">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="이름(필수)"
                value={newMemberForm.name}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, name: v }))}
              />
              <SelectField
                label="role"
                value={newMemberForm.role}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, role: v as Role }))}
                options={['정회원', '준회원', '운영진']}
              />
            </div>

            <SelectField
              label="학교"
              value={newMemberForm.school}
              onChange={(v) => setNewMemberForm((p) => ({ ...p, school: v }))}
              options={['연세대', '고려대']}
            />

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="레벨"
                value={newMemberForm.level}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, level: v }))}
                options={['입문', '빨', '주', '노', '초', '파', '남', '보', '보+']}
              />
              <TextField
                label="연락처"
                value={newMemberForm.phone_number}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, phone_number: v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="성별"
                value={newMemberForm.gender}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, gender: v }))}
                options={['남', '여']}
              />
              <TextField
                label="출생년도(숫자)"
                value={newMemberForm.birth_year}
                inputMode="numeric"
                onChange={(v) =>
                  setNewMemberForm((p) => ({
                    ...p,
                    birth_year: v.replace(/\D/g, ''),
                  }))
                }
                placeholder="예: 1998"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="지역"
                value={newMemberForm.region}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, region: v }))}
              />
              <TextField
                label="가입연월(YYYY-MM)"
                value={newMemberForm.join_date}
                onChange={(v) => setNewMemberForm((p) => ({ ...p, join_date: v }))}
              />
            </div>

            <TextAreaField
              label="비고"
              value={newMemberForm.comment}
              onChange={(v) => setNewMemberForm((p) => ({ ...p, comment: v }))}
            />

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 h-11 rounded-md border border-slate-200 text-sm font-semibold"
                onClick={() => setNewMemberOpen(false)}
              >
                닫기
              </button>
              <button
                type="button"
                className={[
                  'flex-1 h-11 rounded-md text-sm font-semibold',
                  newMemberForm.name.trim() ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500',
                ].join(' ')}
                disabled={!newMemberForm.name.trim()}
                onClick={() => {
                  const preview = buildNewMemberPreview();
                  if (!preview) return;
                  setNewMemberOpen(false);
                  openConfirm(preview);
                }}
              >
                등록하기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* =========================
   UI Components (local)
   ========================= */

function CheckboxPill({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={[
        'h-10 rounded-md border text-sm font-semibold',
        checked ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function SmallButton({
  active,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'h-10 rounded-md border text-sm font-semibold',
        disabled
          ? 'bg-slate-100 text-slate-400 border-slate-200'
          : active
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-slate-200 text-sm"
          >
            닫기
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full min-h-[88px] px-3 py-2 rounded-md border border-slate-200 text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-11 px-3 rounded-md border border-slate-200 text-sm"
      >
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================
   Helpers
   ========================= */

function getRoleStatusActionLabel(action: RoleStatusAction) {
  switch (action) {
    case 'PROMOTE_TO_STAFF':
      return '운영진 등록';
    case 'DEMOTE_FROM_STAFF':
      return '운영진 해제';
    case 'SET_ASSOCIATE':
      return '준회원 등록';
    case 'UNSET_ASSOCIATE_TO_REGULAR':
      return '준회원 해제(정회원 전환)';
    case 'SET_DORMANT':
      return '휴면 등록';
    case 'UNSET_DORMANT_TO_REGULAR':
      return '휴면 해제(정회원 전환)';
    case 'SET_WITHDRAWN':
      return '탈퇴 처리';
    default:
      return '등급/상태변경';
  }
}

function getProfileEditActionLabel(action: ProfileEditAction) {
  switch (action) {
    case 'UPDATE_PHONE':
      return '연락처 수정';
    case 'UPDATE_REGION':
      return '지역 수정';
    case 'UPDATE_LEVEL':
      return '레벨 수정';
    default:
      return '개인정보 수정';
  }
}

function getOldValueForProfileAction(member: Member, action: ProfileEditAction) {
  switch (action) {
    case 'UPDATE_PHONE':
      return member.phone_number || '-';
    case 'UPDATE_REGION':
      return member.region || '-';
    case 'UPDATE_LEVEL':
      return member.level || '-';
    default:
      return '-';
  }
}
