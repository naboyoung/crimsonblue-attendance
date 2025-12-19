import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased pb-[calc(72px+env(safe-area-inset-bottom))]">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
