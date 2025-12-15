// ✅ src/app/api/members/actions/role-status/route.ts
import { NextResponse } from 'next/server';
import { applyRoleStatusChange } from '@/lib/server/memberManageService';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];
    const action = body.action;
    const changedBy = String(body.changedBy ?? '').trim();

    if (memberIds.length === 0) {
      return NextResponse.json({ ok: false, message: '대상자를 선택해주세요.' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ ok: false, message: '작업을 선택해주세요.' }, { status: 400 });
    }
    if (!changedBy) {
      return NextResponse.json({ ok: false, message: '작성자명은 필수입니다.' }, { status: 400 });
    }

    const result = await applyRoleStatusChange({ memberIds, action, changedBy });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
