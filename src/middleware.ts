import { NextRequest, NextResponse } from "next/server";
import { getCookieName, verifySessionToken } from "@/lib/server/authToken";

const PUBLIC_PATHS = new Set(["/login"]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function isPublicApi(pathname: string) {
  // ✅ 로그인만 공개. 나머지 auth/me, logout, change-password는 로그인 필요.
  return pathname === "/api/auth/login";
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isStaticAsset(pathname) || PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // env 누락 시 안전하게 막기
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ ok: false, error: "AUTH_SECRET missing" }, { status: 500 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const token = req.cookies.get(getCookieName())?.value;
  const verified = token ? await verifySessionToken(secret, token) : { ok: false as const, reason: "no_token" };

  if (verified.ok) return NextResponse.next();

  // 미로그인 처리
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
