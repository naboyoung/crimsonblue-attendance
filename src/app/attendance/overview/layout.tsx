'use client';

import { usePathname, useRouter } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';

/**
 * 🔧 FINAL TUNE
 * - View Switcher 버튼 py-1 → py-2
 * - 시각적 크기 거의 동일
 * - 모바일 터치 영역만 안전 기준으로 보완
 */

export default function AttendanceOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const viewMode: 'session' | 'member' =
    pathname.includes('/member') ? 'member' : 'session';

  return (
    <PageShell>
      <div className="mt-4 pb-24">
        {/* 출석현황 압축 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              출석 현황
            </h2>
            <p className="text-xs text-muted-foreground">
              세션 / 회원 기준으로 확인
            </p>
          </div>

          {/* View Switcher */}
          <div className="inline-flex rounded-md bg-muted p-0.5 text-xs -mt-1">
            <button
              type="button"
              onClick={() => router.push('/attendance/overview/session')}
              className={`px-3 py-2 rounded transition
                ${
                  viewMode === 'session'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              세션
            </button>

            <button
              type="button"
              onClick={() => router.push('/attendance/overview/member')}
              className={`px-3 py-2 rounded transition
                ${
                  viewMode === 'member'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              회원
            </button>
          </div>
        </div>

        {/* 하위 페이지 */}
        <div className="mt-6">{children}</div>
        
      </div>
    </PageShell>
  );
}
