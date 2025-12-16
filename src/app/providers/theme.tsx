"use client";
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const raw = localStorage.getItem("theme");
    const saved: Theme = raw === "dark" ? "dark" : "light"; // ✅ system 등 이상값 방어
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  const setTheme = (next: Theme) => {
    localStorage.setItem("theme", next);
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
}
