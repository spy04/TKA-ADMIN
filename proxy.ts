import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminAuthenticatedInRequest } from "@/lib/auth";

const protectedRoutes = ["/admin"];
const publicRoutes = ["/admin/login"];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = isAdminAuthenticatedInRequest(request.cookies);

  if (isPublicPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isProtectedPath(pathname) && !isPublicPath(pathname) && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
