"use client";

import * as React from "react";

export type BadgeVariant =
  // role
  | "role_admin"
  | "role_regular"
  | "role_associate"
  | "role_ob"
  | "role_dormant"
  | "role_withdrawn"
  // meeting
  | "meeting_regular"
  | "meeting_rental"
  | "meeting_other"
  // misc
  | "newbie"
  | "muted";

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 font-medium whitespace-nowrap";

const VARIANT: Record<BadgeVariant, string> = {
  // roles (운영진만 강하게, 나머지는 톤 차이)
  role_admin: "bg-zinc-900 text-white text-xs font-semibold",
  role_regular: "border border-slate-200 bg-slate-100 text-slate-700 text-xs",
  role_associate: "border border-slate-200 bg-slate-50 text-slate-600 text-xs",
  role_ob: "border border-blue-200 bg-blue-50 text-blue-700 text-xs",
  role_dormant: "border border-zinc-200 bg-zinc-100 text-zinc-500 text-xs",
  role_withdrawn: "border border-zinc-200 bg-zinc-200 text-zinc-500 text-xs",

  // meetings (A안: 전부 neutral로)
  meeting_regular: "border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs",
  meeting_rental: "border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs",
  meeting_other: "border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs",

  // newbie (가벼운 포인트)
  newbie: "border border-indigo-200 bg-indigo-50 text-indigo-600 text-[11px]",

  // fallback / 없음
  muted: "border border-zinc-200 bg-zinc-100 text-zinc-500 text-xs",
};

export function Badge({
  variant,
  children,
  className = "",
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={[BASE, VARIANT[variant], className].join(" ")}>{children}</span>;
}
