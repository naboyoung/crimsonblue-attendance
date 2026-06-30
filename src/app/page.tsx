import PageShell from "@/components/layout/PageShell";
import { HomeCalendar } from '@/components/home/HomeCalendar';
import { HomeDashboard } from '@/components/home/HomeDashboard';


export default function HomePage() {
  return (
    <PageShell>
      {/* Header */}
      <header className="flex items-center justify-center pt-3">
        <div className="min-w-0 text-center">
          <h1 className="text-xl font-bold tracking-tight truncate">
            크림슨블루 출석부
          </h1>
          <p className="mt-1 text-sm text-muted">CrimsonBlue Attendance System</p>
        </div>
      </header>

      <section>
        <HomeDashboard />
      </section>

      <section className="mt-4">
        <HomeCalendar />
      </section>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs text-muted">
        © 2026 CrimsonBlue by NBY.  All rights reserved.

      </footer>
    </PageShell>
  );
}
