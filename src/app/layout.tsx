import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import type { Metadata } from "next";

/** ✅ 여기! RootLayout 위에 선언 */
export const metadata: Metadata = {
  title: "크림슨블루 출석부",
  description: "크림슨블루 클라이밍 크루 출석 관리",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* iOS 대응용 메타 (metadata로는 부족함) */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased pb-[calc(72px+env(safe-area-inset-bottom))]">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
