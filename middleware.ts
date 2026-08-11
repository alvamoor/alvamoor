// This file is the site's locale routing, and that is all it is. The handler below
// redirects the bare "/" to a language (there is no app/page.tsx, so nothing else
// answers the front door), prefixes unprefixed paths, negotiates from
// Accept-Language, sets the NEXT_LOCALE cookie, and publishes the header that
// getLocale reads for <html lang>. Nothing else performs any of that, so if this
// stops running, language handling stops with it.
//
// Which is why Next 16's warning that this convention is deprecated in favour of
// `proxy` must be ignored, and the middleware-to-proxy codemod must NOT be run:
// `proxy` runs on the Node.js runtime only and cannot be configured, while
// @opennextjs/cloudflare bundles edge middleware only — it reads
// middleware-manifest.json's middleware["/"] entry, and its dist mentions
// "proxy" nowhere. The rename would build clean and silently drop locale routing
// in production. See README, "Ignore the middleware deprecation warning".
// Revisit when OpenNext supports Node middleware.
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|favicon|opengraph-image|twitter-image|robots|sitemap|manifest|showroom|admin|.*\\..*).*)",
  ],
};
