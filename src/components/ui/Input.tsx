import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-card px-4 text-fg placeholder:text-muted " +
          "outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/30",
        className
      )}
      {...props}
    />
  );
}
