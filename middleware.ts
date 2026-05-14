import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|favicon|opengraph-image|twitter-image|robots|sitemap|manifest|.*\\..*).*)",
  ],
};
