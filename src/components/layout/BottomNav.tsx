"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Users, MoreHorizontal } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/attendance", label: "출석", icon: CheckSquare },
  { href: "/members", label: "회원", icon: Users },
  { href: "/more", label: "더보기", icon: MoreHorizontal },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/my")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:bg-black/70">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition",
                active
                  ? "bg-black/5 text-fg dark:bg-white/10"
                  : "text-fg/60 hover:text-fg",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-5 w-5",
                  active ? "opacity-100" : "opacity-80",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[11px] leading-none",
                  active ? "font-semibold" : "font-medium",
                ].join(" ")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
