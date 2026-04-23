import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  VOTER_COOKIE_NAME,
  verifyAdminToken,
  verifyVoterToken,
} from "@/lib/jwt";

const adminProtectedRoutes = [
  "/admin/dashboard",
  "/admin/voters",
  "/admin/candidates",
  "/admin/results",
  "/admin/config",
  "/admin/logs",
  "/admin/vote-attempts",
];

const voterProtectedRoutes = ["/vote"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminSession = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const voterSession = request.cookies.get(VOTER_COOKIE_NAME)?.value;

  // Keep already authenticated admins away from login page.
  if (
    pathname === "/admin" &&
    adminSession &&
    (await verifyAdminToken(adminSession))
  ) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Require session cookie for admin-protected routes.
  if (startsWithAny(pathname, adminProtectedRoutes)) {
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    try {
      const adminPayload = await verifyAdminToken(adminSession);
      if (!adminPayload) throw new Error("Invalid token");

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-admin-id", adminPayload.adminId.toString());

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch {
      const response = NextResponse.redirect(new URL("/admin", request.url));
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }
  }

  // Require valid session cookie for voter-protected routes.
  if (startsWithAny(pathname, voterProtectedRoutes)) {
    const voterPayload = voterSession
      ? await verifyVoterToken(voterSession)
      : null;

    if (!voterPayload) {
      const response = NextResponse.redirect(new URL("/", request.url));
      if (voterSession) {
        response.cookies.delete(VOTER_COOKIE_NAME);
      }
      return response;
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
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
