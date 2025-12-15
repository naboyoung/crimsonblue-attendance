import ThemeToggle from "@/components/ThemeToggle";
import LinkRow from "@/components/ui/LinkRow";

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

        {/* Menu */}
        <section className="mt-8">
          <div className="space-y-2">
            <LinkRow
              href="/attendance/register"
              title="출석 등록"
              description="모임 정보 입력 + 출석자 명단 등록"
            />
            <LinkRow
              href="/attendance/overview"
              title="출석 현황"
              description="세션별 / 멤버별"
            />
            <LinkRow
              href="/members/lookup"
              title="회원정보 조회"
              description="회원 기본 정보 조회"
            />
            <LinkRow
              href="/members/manage"
              title="회원정보 관리"
              description="등급/상태변경, 개인정보 수정"
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-muted">
          © 2026 CrimsonBlue by NBY.  All rights reserved.

        </footer>
      </div>
    </main>
  );
}
