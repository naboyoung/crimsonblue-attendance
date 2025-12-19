"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
};

type Props = {
  tabs: Tab[];
  /** 탭이 활성화로 판단되는 기준 prefix (예: "/attendance") */
  basePath?: string;
};

function isTabActive(pathname: string, href: string) {
  // 정확히 일치 or 하위 경로
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="mb-4">
      
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-1">
        <div className={`grid grid-cols-${tabs.length} gap-1`}>
          {tabs.map((t) => {
            const active = isTabActive(pathname, t.href);

            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "rounded-xl px-3 py-2 text-center text-sm transition",
                  active
                    ? "bg-white text-fg shadow-sm dark:bg-white/10"
                    : "text-fg/70 hover:text-fg",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
