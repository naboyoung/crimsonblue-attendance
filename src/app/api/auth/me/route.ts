import { NextResponse } from "next/server";
import { getCookieName, verifySessionToken } from "@/lib/server/authToken";

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

export async function GET(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  const token = readCookie(req, getCookieName());
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const verified = await verifySessionToken(secret, token);
  if (!verified.ok) return NextResponse.json({ ok: false }, { status: 401 });

  return NextResponse.json({ ok: true });
}
