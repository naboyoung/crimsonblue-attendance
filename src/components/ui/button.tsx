import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "ghost"
  | "outline"
  | "secondary"
  | "destructive";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";

  const sizeCls = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2 text-sm";

  const styles =
    variant === "primary"
      ? "bg-black text-white shadow-soft hover:opacity-90"
      : variant === "ghost"
      ? "bg-transparent text-fg hover:bg-white/5"
      : variant === "outline"
      ? "border border-white/15 bg-transparent text-fg hover:bg-white/5"
      : variant === "secondary"
      ? "bg-white/10 text-fg hover:bg-white/15"
      : "bg-red-600 text-white hover:bg-red-700";


  return (
    <button
      className={[base, sizeCls, styles, className].join(" ")}
      {...props}
    />
  );
}
