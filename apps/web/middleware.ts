import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const sessionCookieName = "saayro_session";

function isAuthRoute(pathname: string) {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/auth/otp");
}

function isProtectedRoute(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(sessionCookieName);
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname) && !sessionCookie) {
    const nextUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(nextUrl);
  }

  if (isAuthRoute(pathname) && sessionCookie) {
    const nextUrl = new URL("/app", request.url);
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sign-in", "/sign-up", "/auth/:path*", "/app/:path*"],
};
