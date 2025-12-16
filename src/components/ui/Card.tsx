export default function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-xl border border-border bg-card",
        "shadow-soft",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
