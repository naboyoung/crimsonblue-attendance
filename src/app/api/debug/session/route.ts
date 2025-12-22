import { NextRequest, NextResponse } from "next/server";
import { getCookieName, verifySessionToken } from "@/lib/server/authToken";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(getCookieName())?.value ?? null;
  const secret = process.env.AUTH_SECRET ?? "";

  if (!token) {
    return NextResponse.json({ ok: false, reason: "no_cookie" }, { headers: { "Cache-Control": "no-store" } });
  }

  const v = await verifySessionToken(secret, token);
  return NextResponse.json(
    { ok: v.ok, tokenPresent: true, reason: v.ok ? null : v.reason },
    { headers: { "Cache-Control": "no-store" } }
  );
}
