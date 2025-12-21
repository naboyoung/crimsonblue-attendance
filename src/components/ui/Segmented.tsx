'use client';

import * as React from 'react';

type Option<T extends string> = { value: T; label: string };

type BaseProps<T extends string> = {
  options: Option<T>[];
  className?: string;
  disabled?: boolean;
  scroll?: boolean;
};

type SingleProps<T extends string> = BaseProps<T> & {
  mode?: 'single'; // default
  value: T;
  onChange: (v: T) => void;
};

type MultiProps<T extends string> = BaseProps<T> & {
  mode: 'multi';
  value: readonly T[];
  onChange: (v: T[]) => void;
};

export default function Segmented<T extends string>(props: SingleProps<T> | MultiProps<T>) {
  const { options, className = '', disabled } = props;

  const isMulti = props.mode === 'multi';

  const isActive = React.useCallback(
    (v: T) => {
      if (isMulti) return (props.value as readonly T[]).includes(v);
      return props.value === v;
    },
    [isMulti, props]
  );

  const toggleValue = React.useCallback(
    (v: T) => {
      if (disabled) return;

      if (isMulti) {
        const curr = props.value as readonly T[];
        const next = curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v];
        (props as MultiProps<T>).onChange([...next]);
        return;
      }

      (props as SingleProps<T>).onChange(v);
    },
    [disabled, isMulti, props]
  );

  /**
   * ✅ SessionView 기준 “라이트 segmented”
   * - wrap: bg-slate-100
   * - active: bg-white shadow-sm
   * - inactive: text-slate-500 hover:text-slate-900
   */
  return (
    <div className={['inline-flex w-full rounded-xl bg-slate-100 p-1', className].join(' ')}>
      {options.map((opt) => {
        const active = isActive(opt.value);

        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggleValue(opt.value)}
            className={[
              'flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium transition',
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
              disabled ? 'opacity-60' : '',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
