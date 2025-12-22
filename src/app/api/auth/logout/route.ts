import { NextResponse } from "next/server";
import { getCookieName } from "@/lib/server/authToken";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: getCookieName(),
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
