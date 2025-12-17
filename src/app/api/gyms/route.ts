import { NextResponse } from 'next/server';
import { readSheetObjects } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const rows = await readSheetObjects('GymList');

    const labels = (Array.isArray(rows) ? rows : [])
      .map((r: any) => {
        const gym = String(r?.gym_name ?? '').trim();
        const branch = String(r?.branch_name ?? '').trim();

        if (!gym) return '';
        return branch ? `${gym} ${branch}` : gym; // ✅ 공백 한 칸 조합
      })
      .filter(Boolean);

    // 중복 제거 + 정렬
    const uniq = Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b, 'ko'));

    return NextResponse.json({ ok: true, data: uniq });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load gyms';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
