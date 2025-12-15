"use client";

import { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

function getSystemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");

  // UI 표시용: 현재 실제 적용 중인 테마
  const effectiveIsDark = useMemo(() => {
    if (!mounted) return false;
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return getSystemPrefersDark();
  }, [mode, mounted]);

  useEffect(() => {
    setMounted(true);

    const saved = (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
    setMode(saved);

    const apply = (m: ThemeMode) => {
      const shouldDark = m === "dark" || (m === "system" && getSystemPrefersDark());
      document.documentElement.classList.toggle("dark", shouldDark);
    };

    apply(saved);

    // system 모드일 때만 OS 테마 변경을 추적
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const onChange = () => {
      const current = (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
      if (current === "system") apply("system");
    };

    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const applyMode = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem("theme", next);

    const shouldDark = next === "dark" || (next === "system" && getSystemPrefersDark());
    document.documentElement.classList.toggle("dark", shouldDark);
  };

  if (!mounted) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card p-1">
      <button
        type="button"
        onClick={() => applyMode("light")}
        className={[
          "rounded-lg px-3 py-1.5 text-sm font-medium",
          mode === "light" ? "bg-brand text-white" : "text-fg hover:bg-white/5",
        ].join(" ")}
      >
        Light
      </button>

      <button
        type="button"
        onClick={() => applyMode("dark")}
        className={[
          "rounded-lg px-3 py-1.5 text-sm font-medium",
          mode === "dark" ? "bg-brand text-white" : "text-fg hover:bg-white/5",
        ].join(" ")}
      >
        Dark
      </button>

      <button
        type="button"
        onClick={() => applyMode("system")}
        className={[
          "rounded-lg px-3 py-1.5 text-sm font-medium",
          mode === "system" ? "bg-brand text-white" : "text-fg hover:bg-white/5",
        ].join(" ")}
      >
        System
      </button>

      <span className="ml-1 hidden sm:inline text-xs text-muted">
        (now: {effectiveIsDark ? "dark" : "light"})
      </span>
    </div>
  );
}
