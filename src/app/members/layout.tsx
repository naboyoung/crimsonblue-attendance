import TopTabs from "@/components/layout/TopTabs";

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-6">
      <TopTabs
        tabs={[
          { label: "회원 조회", href: "/members/lookup" },
          { label: "회원 관리", href: "/members/manage" },
        ]}
      />
      {children}
    </div>
  );
}
