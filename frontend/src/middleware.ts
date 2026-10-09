import { NextResponse, type NextRequest } from "next/server";

/** Panels need a session cookie. Role checks happen in the panel layout (via /api/me) and, authoritatively, in Django. */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("access_token") || req.cookies.has("refresh_token");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/doctor-panel/:path*", "/center-panel/:path*", "/ops/:path*", "/booking/:path*", "/join/:path*", "/consult/:path*", "/orders/:path*", "/notifications"],
};
