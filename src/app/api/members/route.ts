import { NextResponse } from 'next/server';

// ✅ 여기 import는 “현재 프로젝트에서 실제로 쓰고 있는 구글시트 읽기 함수”에 맞춰야 해.
// 아래는 가장 흔한 형태(객체 배열로 읽기) 예시야.
// 프로젝트에 이미 있는 함수명이 다르면, 그 이름만 네 프로젝트에 맞춰 바꿔줘.
import { readSheetObjects } from '@/lib/server/googleSheets'; // ✅ 자동완성 추가(또는 기존 members API 고도화)

export async function GET() {
  try {
    // Members 시트 컬럼:
    // member_id, name, role, is_active, school, gender, birth_year, phone_number, region, level, join_date, last_updated_at, comment
    const rows = await readSheetObjects('Members');

    return NextResponse.json({
      ok: true,
      data: rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
    return NextResponse.json(
      {
        ok: false,
        message: `members 조회 실패: ${msg}`,
      },
      { status: 500 },
    );
  }
}
