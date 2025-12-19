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
};

function isTabActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="mb-4">
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-1">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const active = isTabActive(pathname, t.href);

            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "flex-1 rounded-xl px-3 py-2 text-center text-sm transition",
                  active
                    ? "bg-white/90 text-fg shadow-sm dark:bg-white/10"
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
