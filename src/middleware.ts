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
  // 로그인 API만 공개
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/_debug/env"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1. 정적 파일 / 공개 페이지는 통과
  if (isStaticAsset(pathname) || PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // 2. 공개 API는 통과
  if (pathname.startsWith("/api") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // 3. 로그인 토큰 확인
  const token = req.cookies.get(getCookieName())?.value;

  // 토큰 없으면 미로그인 처리
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // 4. 토큰 검증
  // ⚠️ secret은 middleware에서 "존재 체크"하지 않음
  const secret = process.env.AUTH_SECRET ?? "";
  const verified = await verifySessionToken(secret, token);

  if (verified.ok) {
    return NextResponse.next();
  }

  // 5. 토큰이 있지만 유효하지 않음
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
