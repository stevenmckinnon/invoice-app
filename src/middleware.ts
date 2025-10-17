import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/legal",
    "/cookies",
  ];
  const isPublicPath = publicPaths.includes(pathname);

  // Skip middleware for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie - try multiple possible names
  // In production (HTTPS), cookies may be prefixed with __Secure- or __Host-
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("__Host-better-auth.session_token")?.value ||
    request.cookies.get("better_auth_session")?.value ||
    request.cookies.get("better-auth-session")?.value;

  const isAuthenticated = !!sessionToken;

  // Redirect unauthenticated users to sign-in
  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages and root to dashboard
  if (isAuthenticated) {
    if (pathname === "/auth/signin" || pathname === "/auth/signup" || pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|JPG|jpeg|gif|webp)$).*)",
  ],
};
