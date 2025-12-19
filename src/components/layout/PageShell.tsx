"use client";

import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * ✅ 모바일 기준 공통 페이지 레이아웃
 * - max-width: md
 * - 좌우 padding
 * - 하단 BottomNav 공간 확보
 * - bg / text 톤 통일
 */
export default function PageShell({ children, className }: PageShellProps) {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div
        className={cn(
          "mx-auto max-w-md px-5 py-6 pb-[88px]", // ← BottomNav 공간
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}
