// ✅ src/lib/server/memberManageService.ts
import crypto from 'crypto';
import { readSheetObjects, appendRows, updateRowByKey } from '@/lib/server/googleSheets'; // ✅ 너 프로젝트 googleSheets.ts에 맞춰져야 함
import { nowKSTString } from '@/lib/server/googleSheets'; // ✅ 없으면 아래 주석 참고

type Role = '운영진' | '정회원' | '준회원' | '휴면' | '탈퇴';

export type RoleStatusAction =
  | 'PROMOTE_TO_STAFF'
  | 'DEMOTE_FROM_STAFF'
  | 'SET_DORMANT'
  | 'UNSET_DORMANT_TO_REGULAR'
  | 'SET_WITHDRAWN'
  | 'SET_ASSOCIATE'
  | 'UNSET_ASSOCIATE_TO_REGULAR';

export type ProfileEditAction = 'UPDATE_PHONE' | 'UPDATE_REGION' | 'UPDATE_LEVEL';

type MemberRow = {
  member_id: string;
  name: string;
  role: Role;
  is_active: string | boolean;
  school: string;
  gender: string;
  birth_year: string;
  phone_number: string;
  region: string;
  level: string;
  join_date: string;
  last_updated_at: string;
  comment: string;
};

function asBool(v: unknown) {
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() === 'true';
}

// ✅ 작성자(운영진) 검증
async function assertWriterIsStaff(writerName: string) {
  const members = (await readSheetObjects('Members')) as any[];
  const ok = members.some((m) => {
    const name = String(m.name ?? '').trim();
    const role = String(m.role ?? '').trim();
    const active = asBool(m.is_active);
    return active && role === '운영진' && name === writerName.trim();
  });
  if (!ok) {
    return {
      ok: false as const,
      status: 400,
      message: '작성자명은 운영진만 가능합니다.',
    };
  }
  return { ok: true as const };
}

// ✅ Members 업데이트 공통: member_id 기준으로 row 업데이트(헤더 기반)
async function updateMember(memberId: string, patch: Partial<MemberRow>) {
  // updateRowByKey는 내부에서 Members 시트의 header를 기준으로
  // keyColumn(member_id)로 row를 찾아 patch만 반영해서 한 줄을 업데이트한다고 가정
  await updateRowByKey('Members', 'member_id', memberId, patch);
}

// ✅ History 기록(헤더 기반 append를 권장)
// MemberInfoHistory 시트 컬럼에 맞춰서, 가능한 컬럼만 채우고 나머지는 빈칸으로 들어가게 만드는 방식이 가장 안전함.
async function appendHistoryRow(data: Record<string, string>) {
  // ✅ 최소 권장 컬럼:
  // history_id, changed_at, changed_by, member_id, change_kind, item, before_json, after_json
  // (너 시트 헤더가 다르면, googleSheets.ts에서 header 기반 appendObject 함수로 바꾸는게 가장 좋음)
  const row = [
    data.history_id ?? '',
    data.changed_at ?? '',
    data.changed_by ?? '',
    data.member_id ?? '',
    data.change_kind ?? '',
    data.item ?? '',
    data.before_json ?? '',
    data.after_json ?? '',
  ];
  await appendRows('MemberInfoHistory', [row]);
}

// =============================
// 1) 등급/상태변경
// =============================
export async function applyRoleStatusChange(params: {
  memberIds: string[];
  action: RoleStatusAction;
  changedBy: string;
}) {
  const writer = params.changedBy.trim();
  if (!writer) return { ok: false as const, status: 400, message: '작성자명은 필수입니다.' };

  const staffCheck = await assertWriterIsStaff(writer);
  if (!staffCheck.ok) return staffCheck;

  const members = (await readSheetObjects('Members')) as MemberRow[];

  const now = nowKSTString(); // ✅ KST
  const actionLabel = getRoleStatusActionLabel(params.action);

  for (const memberId of params.memberIds) {
    const before = members.find((m) => String(m.member_id) === String(memberId));
    if (!before) continue;

    const after: MemberRow = { ...before };

    // ✅ 정책(너가 이전에 정한 규칙 기준)
    // - 휴면해제는 예전 role 무시하고 정회원으로
    // - 탈퇴는 is_active false + role 탈퇴
    // - 휴면은 is_active false + role 휴면
    switch (params.action) {
      case 'PROMOTE_TO_STAFF':
        after.role = '운영진';
        after.is_active = true;
        break;
      case 'DEMOTE_FROM_STAFF':
        after.role = '정회원';
        after.is_active = true;
        break;
      case 'SET_ASSOCIATE':
        after.role = '준회원';
        after.is_active = true;
        break;
      case 'UNSET_ASSOCIATE_TO_REGULAR':
        after.role = '정회원';
        after.is_active = true;
        break;
      case 'SET_DORMANT':
        after.role = '휴면';
        after.is_active = false;
        break;
      case 'UNSET_DORMANT_TO_REGULAR':
        after.role = '정회원'; // ✅ 휴면해제는 정회원으로 고정
        after.is_active = true;
        break;
      case 'SET_WITHDRAWN':
        after.role = '탈퇴';
        after.is_active = false;
        break;
    }

    after.last_updated_at = now;

    // ✅ Members 반영
    await updateMember(memberId, {
      role: after.role,
      is_active: String(after.is_active), // 시트는 string인 경우가 많아서 안전하게 string으로
      last_updated_at: after.last_updated_at,
    });

    // ✅ History 기록
    await appendHistoryRow({
      history_id: crypto.randomUUID(),
      changed_at: now,
      changed_by: writer,
      member_id: String(memberId),
      change_kind: 'ROLE_STATUS',
      item: actionLabel,
      before_json: JSON.stringify({ role: before.role, is_active: before.is_active }),
      after_json: JSON.stringify({ role: after.role, is_active: after.is_active }),
    });
  }

  return { ok: true as const };
}

// =============================
// 2) 개인정보 수정
// =============================
export async function applyProfileEditChange(params: {
  memberId: string;
  action: ProfileEditAction;
  newValue: string;
  changedBy: string;
}) {
  const writer = params.changedBy.trim();
  if (!writer) return { ok: false as const, status: 400, message: '작성자명은 필수입니다.' };

  const staffCheck = await assertWriterIsStaff(writer);
  if (!staffCheck.ok) return staffCheck;

  const members = (await readSheetObjects('Members')) as MemberRow[];
  const before = members.find((m) => String(m.member_id) === String(params.memberId));
  if (!before) {
    return { ok: false as const, status: 404, message: '대상 회원을 찾을 수 없습니다.' };
  }

  const now = nowKSTString();
  const nv = params.newValue.trim();
  if (!nv) return { ok: false as const, status: 400, message: '새 값은 필수입니다.' };

  const actionLabel = getProfileEditActionLabel(params.action);

  let patch: Partial<MemberRow> = { last_updated_at: now };
  let beforeVal = '';

  if (params.action === 'UPDATE_PHONE') {
    beforeVal = before.phone_number ?? '';
    patch.phone_number = nv;
  }
  if (params.action === 'UPDATE_REGION') {
    beforeVal = before.region ?? '';
    patch.region = nv;
  }
  if (params.action === 'UPDATE_LEVEL') {
    beforeVal = before.level ?? '';
    patch.level = nv;
  }

  await updateMember(params.memberId, patch);

  await appendHistoryRow({
    history_id: crypto.randomUUID(),
    changed_at: now,
    changed_by: writer,
    member_id: String(params.memberId),
    change_kind: 'PROFILE_EDIT',
    item: actionLabel,
    before_json: JSON.stringify({ value: beforeVal }),
    after_json: JSON.stringify({ value: nv }),
  });

  return { ok: true as const };
}

// =============================
// 3) 신입 등록
// =============================
export async function createNewMember(params: {
  form: {
    name: string;
    role: Role;
    school: string;
    gender: string;
    birth_year: string;
    phone_number: string;
    region: string;
    level: string;
    join_date: string; // YYYY-MM
    comment: string;
  };
  changedBy: string;
}) {
  const writer = params.changedBy.trim();
  if (!writer) return { ok: false as const, status: 400, message: '작성자명은 필수입니다.' };

  const staffCheck = await assertWriterIsStaff(writer);
  if (!staffCheck.ok) return staffCheck;

  const members = (await readSheetObjects('Members')) as MemberRow[];
  const name = params.form.name.trim();
  if (!name) return { ok: false as const, status: 400, message: '이름은 필수입니다.' };

  // ✅ 동일 이름 중복 방지(너가 원했음)
  const dup = members.some((m) => String(m.name ?? '').trim() === name);
  if (dup) return { ok: false as const, status: 400, message: '동일 이름이 이미 존재합니다.' };

  const now = nowKSTString();

  // ✅ member_id 자동 생성 규칙(너가 따로 규칙 정하지 않았으니 안전하게 UUID 기반)
  // 필요하면 "M001" 같은 규칙으로 바꿔줄게.
  const memberId = `M_${crypto.randomUUID().slice(0, 8)}`;

  // ✅ Members 시트 컬럼 순서(너가 확정한 순서)
  // member_id, name, role, is_active, school, gender, birth_year, phone_number, region, level, join_date, last_updated_at, comment
  const row = [
    memberId,
    name,
    params.form.role,
    'true',
    params.form.school,
    params.form.gender,
    params.form.birth_year,
    params.form.phone_number,
    params.form.region,
    params.form.level,
    params.form.join_date,
    now,
    params.form.comment ?? '',
  ];

  await appendRows('Members', [row]);

  await appendHistoryRow({
    history_id: crypto.randomUUID(),
    changed_at: now,
    changed_by: writer,
    member_id: memberId,
    change_kind: 'NEW_MEMBER',
    item: '신입 등록',
    before_json: '',
    after_json: JSON.stringify({ name, role: params.form.role }),
  });

  return { ok: true as const, memberId };
}

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

/**
 * ✅ 만약 nowKSTString()이 프로젝트에 없다면, 아래로 대체 가능:
 *
 * export function nowKSTString() {
 *   const d = new Date();
 *   const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
 *   const yyyy = kst.getUTCFullYear();
 *   const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
 *   const dd = String(kst.getUTCDate()).padStart(2, '0');
 *   const hh = String(kst.getUTCHours()).padStart(2, '0');
 *   const mi = String(kst.getUTCMinutes()).padStart(2, '0');
 *   const ss = String(kst.getUTCSeconds()).padStart(2, '0');
 *   return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
 * }
 */
