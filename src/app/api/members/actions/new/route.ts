// ✅ src/app/api/members/actions/new/route.ts
import { NextResponse } from 'next/server';
import { createNewMember } from '@/lib/server/memberManageService';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const form = body.form ?? null;
    const changedBy = String(body.changedBy ?? '').trim();

    if (!form) {
      return NextResponse.json({ ok: false, message: '입력값이 없습니다.' }, { status: 400 });
    }
    if (!changedBy) {
      return NextResponse.json({ ok: false, message: '작성자명은 필수입니다.' }, { status: 400 });
    }

    const result = await createNewMember({ form, changedBy });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, memberId: result.memberId }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
