import Link from "next/link";

type Props = {
  href: string;
  title: string;
  description?: string;
};

export default function ButtonLink({ href, title, description }: Props) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-2xl p-4 transition active:scale-[0.99]",
        "bg-card border border-border shadow-soft",
        "hover:bg-brand-weak",
      ].join(" ")}
    >
      <div className="text-base font-semibold text-fg">{title}</div>
      {description ? (
        <div className="mt-1 text-xs text-muted">{description}</div>
      ) : null}
    </Link>
  );
}
