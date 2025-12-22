import { NextResponse } from "next/server";
import { getCookieName, verifySessionToken } from "@/lib/server/authToken";
import { verifyAdminPassword, setAdminPassword } from "@/lib/server/settingsStore";

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(name + "="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 500 });

  // ✅ 세션 체크 (로그인 필수)
  const token = readCookie(req, getCookieName());
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const verified = await verifySessionToken(secret, token);
  if (!verified.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, error: "Both passwords required" }, { status: 400 });
  }
  if (newPassword.length < 10) {
    return NextResponse.json({ ok: false, error: "New password too short" }, { status: 400 });
  }

  const v = await verifyAdminPassword(currentPassword);
  if (!v.ok) return NextResponse.json({ ok: false, error: "Current password incorrect" }, { status: 401 });

  await setAdminPassword(newPassword);
  return NextResponse.json({ ok: true });
}
