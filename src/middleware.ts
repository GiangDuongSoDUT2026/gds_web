import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const tokenFromCookie = request.cookies.get("access_token")?.value;
  const isPageRequest = !pathname.startsWith("/api/");

  if (!tokenFromCookie && isPageRequest) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude /api/ routes from Edge Runtime — uploads go directly through rewrite
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)" ],
};
