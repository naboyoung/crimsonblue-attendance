import { NextResponse } from 'next/server';
import { readSheetObjects } from '@/lib/server/googleSheets';

export async function GET() {
  try {
    const rows = await readSheetObjects('AttendanceHistory');

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: true, data: { recentSessionId: '' } });
    }

    let maxId = -Infinity;
    let maxSid = '';

    for (const row of rows) {
      const sid = String((row as any)?.session_id ?? '').trim();
      if (!sid) continue;
      const n = Number(sid);
      if (Number.isFinite(n) && n > maxId) {
        maxId = n;
        maxSid = sid;
      }
    }

    return NextResponse.json({ ok: true, data: { recentSessionId: maxSid } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load recent session';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

