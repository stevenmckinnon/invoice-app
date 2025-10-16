export function middleware(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Skip API routes
  if (pathname.startsWith("/api/")) {
    return;
  }

  // Public paths
  const isPublic = pathname === "/" || pathname === "/auth/signin" || pathname === "/auth/signup";
  
  // Get cookies
  const cookieHeader = request.headers.get("cookie") || "";
  const hasSession = cookieHeader.includes("better-auth.session_token=");

  // Redirect logic
  if (!hasSession && !isPublic) {
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  if (hasSession && (pathname === "/auth/signin" || pathname === "/auth/signup")) {
    url.pathname = "/";
    return Response.redirect(url);
  }
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
