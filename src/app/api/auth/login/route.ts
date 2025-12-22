import { NextResponse } from "next/server";
import { getCookieName, getTokenTtlDays, issueSessionToken } from "@/lib/server/authToken";
import { getAdminPasswordHash, setAdminPassword, verifyAdminPassword } from "@/lib/server/settingsStore";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  const secret = process.env.AUTH_SECRET;
  const bootstrapPw = process.env.ADMIN_PASSWORD; // ✅ 최초 1회 세팅용

  if (!secret) return NextResponse.json({ ok: false, error: "AUTH_SECRET missing" }, { status: 500 });

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ ok: false, error: "Password required" }, { status: 400 });
  }

  const existingHash = await getAdminPasswordHash();

  // ✅ 초기화: Settings에 해시가 없으면 env 비밀번호로 1회 초기화 가능
  if (!existingHash) {
    if (!bootstrapPw) {
      return NextResponse.json({ ok: false, error: "Admin password not initialized" }, { status: 503 });
    }
    if (password !== bootstrapPw) {
      return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
    }
    await setAdminPassword(password); // Settings에 bcrypt 해시 저장
  } else {
    const v = await verifyAdminPassword(password);
    if (!v.ok) return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const token = await issueSessionToken(secret);
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: getCookieName(),
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: getTokenTtlDays() * 24 * 60 * 60,
  });

  return res;
}
