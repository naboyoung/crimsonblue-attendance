import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

/** ✅ RootLayout 위 */
export const metadata: Metadata = {
  title: "크림슨블루 출석부",
  description: "크림슨블루 클라이밍 크루 출석 관리",
  manifest: "/manifest.json",
};

// ✅ Next 16 권장: themeColor는 viewport로 이동
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ iOS 홈화면 아이콘 (가장 중요) */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* iOS PWA 설정 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>

      <body className="min-h-screen bg-bg text-fg antialiased pb-[calc(72px+env(safe-area-inset-bottom))]">
        {children}
        <BottomNav />

        {/* ✅ 전역 토스트 */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
