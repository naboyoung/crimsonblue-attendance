import TopTabs from "@/components/layout/TopTabs";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-6">
      <TopTabs
        title="출석"
        tabs={[
          { label: "출석 등록", href: "/attendance/register" },
          { label: "출석 현황", href: "/attendance/overview" },
        ]}
      />
      {children}
    </div>
  );
}
