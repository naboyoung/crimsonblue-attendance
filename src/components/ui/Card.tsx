import React from "react";

export default function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        // ✅ members/lookup/page의 카드 톤과 동일
        "rounded-2xl border border-zinc-200 bg-white",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
