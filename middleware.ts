import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const m = req.nextUrl.pathname.match(/^\/(en|de)\/gallery(\/.*)?$/);
  if (m) {
    const rest = m[2] ?? "";
    return NextResponse.redirect(new URL(`/gallery${rest}`, req.url));
  }
  return intl(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|favicon|opengraph-image|twitter-image|robots|sitemap|manifest|gallery|admin|.*\\..*).*)",
  ],
};
