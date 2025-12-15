'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  noResultsText?: string;
  inputClassName?: string;
};

export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  noResultsText = '일치하는 회원이 없습니다.',
  inputClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((name) => (name ?? '').toLowerCase().includes(q))
      .slice(0, 20);
  }, [value, options]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={
          inputClassName ??
          'w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400'
        }
      />

      {open && value.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">{noResultsText}</div>
          ) : (
            <ul className="max-h-56 overflow-auto">
              {filtered.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
