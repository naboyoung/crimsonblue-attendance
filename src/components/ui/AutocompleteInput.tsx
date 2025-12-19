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
};

export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  noResultsText = "검색 결과가 없습니다.",
  disabled,
}: Props) {
  // (너 기존 로직 유지)

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(FIELD_BASE)}
      />

      {/* (너 기존 드롭다운 렌더링 유지) */}
    </div>
  );
}
