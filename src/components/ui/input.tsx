"use client";

import * as React from "react";
import { cx, FIELD_BASE } from "./fieldStyles";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cx(FIELD_BASE, className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
