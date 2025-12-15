import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 rounded-xl text-sm",
    md: "h-11 px-4 rounded-2xl text-sm",
    lg: "h-12 px-5 rounded-2xl text-base",
  };

  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:brightness-95",
    secondary:
      "bg-card text-fg border border-border hover:bg-brand-weak hover:text-fg",
    ghost: "bg-transparent text-fg hover:bg-brand-weak",
    destructive: "bg-red-600 text-white hover:brightness-95",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
