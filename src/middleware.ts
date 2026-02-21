import { NextRequest, NextResponse } from "next/server";
import { getCookieName, verifySessionToken } from "@/lib/server/authToken";

// ✅ 1. 공개 페이지 체크 함수 (기존 Set 대신 더 유연한 방식 사용)
function isPublicPage(pathname: string) {
  return (
    pathname === "/login" || pathname === "/my" || pathname.startsWith("/my/") // /my/view 등 하위 경로 모두 허용
  );
}

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

// ✅ 공개 API: 로그인 + 디버그(점검) + 크루원 조회 엔드포인트
function isPublicApi(pathname: string) {
  if (pathname === "/api/auth/login") return true;
  if (pathname.startsWith("/api/debug/")) return true;
  if (pathname.startsWith("/api/my/")) return true; // 크루원 조회 API 허용
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) 정적 / 공개 페이지는 통과 (✅ isPublicPage 함수 사용)
  if (isStaticAsset(pathname) || isPublicPage(pathname)) {
    return NextResponse.next();
  }

  // 2) 공개 API는 통과
  if (pathname.startsWith("/api") && isPublicApi(pathname)) {
    return NextResponse.next();
  }

  // 3) 여기부터는 '운영진용' 로그인 필요 영역
  const token = req.cookies.get(getCookieName())?.value;

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // 4) 토큰 검증
  const secret = process.env.AUTH_SECRET ?? "";
  const verified = await verifySessionToken(secret, token);

  if (verified.ok) return NextResponse.next();

  // 5) 토큰이 있으나 실패
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
