import Link from "next/link";

export default function LinkRow({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="
        group
        block
        min-h-[72px]
        rounded-xl
        border border-border
        bg-card
        p-5
        shadow-soft

        transition-all duration-150 ease-out

        hover:bg-white/60
        dark:hover:bg-white/5

        active:scale-[0.98]
        active:bg-black/5
        dark:active:bg-white/10
        active:shadow-none

        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-brand/40
      "
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg font-semibold text-fg transition-colors dark:group-hover:text-brand">
            {title}
          </div>
          {description && (
            <div className="mt-1 text-xs text-muted">
              {description}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
