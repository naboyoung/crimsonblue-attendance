import { ThemeToggle } from "@/components/ThemeToggle";
import { HomeCalendar } from '@/components/home/HomeCalendar';


export default function HomePage() {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-md px-5 py-6">
        {/* Header */}
        <header className="flex items-center justify-center">
          <div className="min-w-0 text-center">
            <h1 className="text-xl font-bold tracking-tight truncate">
              크림슨블루 출석부
            </h1>
            <p className="mt-1 text-sm text-muted">CrimsonBlue Attendance System</p>
          </div>
        </header>

        {/* Theme toggle (확인용: 추후 /settings 로 이동 가능) */}
        <div className="mt-4">
          <ThemeToggle />
        </div>
        {/* 기존 콘텐츠가 있다면 위/아래에 유지 */}
        
        <section>
          <h1 className="mb-3 text-lg font-semibold">
            일정 관리
          </h1>
          <HomeCalendar />
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-muted">
          © 2026 CrimsonBlue by NBY.  All rights reserved.

        </footer>
      </div>
    </main>
  );
}
