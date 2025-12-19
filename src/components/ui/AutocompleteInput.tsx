"use client";

import * as React from "react";
import { FIELD_BASE, cx } from "./fieldStyles";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  maxResults?: number;
};

export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  noResultsText = "검색 결과가 없습니다.",
  disabled,
  maxResults = 8,
}: Props) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const q = String(value ?? "").trim();

  // ✅ 포함 검색(대소문자 무시) + 최대 N개
  const filtered = React.useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return options
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .filter((name) => name.toLowerCase().includes(lower))
      .slice(0, maxResults);
  }, [q, options, maxResults]);

  // 입력값이 있고 필터가 있으면 열기
  React.useEffect(() => {
    if (!q) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    setOpen(true);
  }, [q]);

  // 바깥 클릭 시 닫기
  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!rootRef.current?.contains(el)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const selectValue = React.useCallback(
    (next: string) => {
      onChange(next);
      setOpen(false);
      setActiveIndex(-1);
      // 선택 후 포커스 유지(모바일 키보드 유지/편집 가능)
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((i) => {
        const next = i + 1;
        return next >= filtered.length ? 0 : next;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((i) => {
        const next = i - 1;
        return next < 0 ? filtered.length - 1 : next;
      });
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        selectValue(filtered[activeIndex]);
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showDropdown = open && !disabled && q.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (String(value ?? "").trim().length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cx(FIELD_BASE)}
        autoComplete="off"
      />

      {showDropdown && (
        <div
          className={cx(
            "absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg z-50"
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              {noResultsText}
            </div>
          ) : (
            <div className="max-h-56 overflow-auto">
              {filtered.map((name, idx) => {
                const active = idx === activeIndex;
                return (
                  <button
                    key={`${name}-${idx}`}
                    type="button"
                    className={cx(
                      "w-full px-3 py-2 text-left text-sm",
                      active ? "bg-slate-100" : "hover:bg-slate-50"
                    )}
                    // mousedown에서 선택해야 blur보다 먼저 실행됨
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectValue(name);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
