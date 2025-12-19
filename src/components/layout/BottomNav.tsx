"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈" },
  { href: "/attendance", label: "출석" },
  { href: "/members", label: "회원" },
  { href: "/more", label: "더보기" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:bg-black/70">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs transition",
                active ? "bg-black/5 font-semibold text-fg dark:bg-white/10" : "text-fg/60 hover:text-fg",
              ].join(" ")}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
