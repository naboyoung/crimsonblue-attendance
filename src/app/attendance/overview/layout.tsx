import PageShell from '@/components/layout/PageShell';
import TopTabs from '@/components/layout/TopTabs';

export default function AttendanceOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <TopTabs
        tabs={[
          { label: '세션별', href: '/attendance/overview/session' },
          { label: '회원별', href: '/attendance/overview/member' },
        ]}
      />
      {children}
    </PageShell>
  );
}
