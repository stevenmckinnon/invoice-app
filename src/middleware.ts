import { auth } from "@/auth";

export default auth((req) => {
  if (
    !req.auth &&
    req.nextUrl.pathname !== "/auth/signin" &&
    req.nextUrl.pathname !== "/" &&
    req.nextUrl.pathname !== "/auth/signup"
  ) {
    const newUrl = new URL("/auth/signin", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
});

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
