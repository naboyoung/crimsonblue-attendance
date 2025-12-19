// src/components/ui/fieldStyles.ts
export const FIELD_BASE = [
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
  "placeholder:text-slate-400",
  "transition",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

export function cx(...args: Array<string | undefined | null | false>) {
  return args.filter(Boolean).join(" ");
}
