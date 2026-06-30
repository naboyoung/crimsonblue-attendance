import PageShell from "@/components/layout/PageShell";
import { HomeCalendar } from '@/components/home/HomeCalendar';
import { HomeDashboard } from '@/components/home/HomeDashboard';


export default function HomePage() {
  return (
    <PageShell>
      <header className="flex items-center justify-center pt-2 pb-1">
        <span className="text-xs font-semibold text-zinc-400 tracking-widest">크블</span>
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
