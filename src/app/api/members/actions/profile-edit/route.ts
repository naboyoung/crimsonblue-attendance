// ✅ src/app/api/members/actions/profile-edit/route.ts
import { NextResponse } from 'next/server';
import { applyProfileEditChange } from '@/lib/server/memberManageService';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const memberId = String(body.memberId ?? '').trim();
    const action = body.action;
    const newValue = String(body.newValue ?? '');
    const changedBy = String(body.changedBy ?? '').trim();

    if (!memberId) {
      return NextResponse.json({ ok: false, message: '대상 회원이 필요합니다.' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ ok: false, message: '작업을 선택해주세요.' }, { status: 400 });
    }
    if (!newValue.trim()) {
      return NextResponse.json({ ok: false, message: '새 값은 필수입니다.' }, { status: 400 });
    }
    if (!changedBy) {
      return NextResponse.json({ ok: false, message: '작성자명은 필수입니다.' }, { status: 400 });
    }

    const result = await applyProfileEditChange({ memberId, action, newValue, changedBy });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
