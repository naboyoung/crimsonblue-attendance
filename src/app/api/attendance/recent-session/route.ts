import { NextResponse } from 'next/server';
import { readSheetObjects } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const rows = await readSheetObjects('AttendanceHistory');

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: true, data: { recentSessionId: '' } });
    }

    for (let i = rows.length - 1; i >= 0; i--) {
      const sid = String((rows[i] as any)?.session_id ?? '').trim();
      if (sid) {
        return NextResponse.json({ ok: true, data: { recentSessionId: sid } });
      }
    }

    return NextResponse.json({ ok: true, data: { recentSessionId: '' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load recent session';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

