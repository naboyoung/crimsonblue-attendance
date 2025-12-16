type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99]";

  const styles =
    variant === "primary"
      ? "bg-brand text-white shadow-soft hover:opacity-90"
      : "bg-transparent text-fg hover:bg-white/5";

  return <button className={[base, styles, className].join(" ")} {...props} />;
}
