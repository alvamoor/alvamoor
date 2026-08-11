import type { MetadataRoute } from "next";

const SITE = "https://alvamoor.com";

export default function robots(): MetadataRoute.Robots {
  return {
    // The disallowed paths are not secrets — /admin sits behind Cloudflare Access
    // and /api/admin validates the Access JWT in the Worker itself, so a crawler
    // reaching either only ever collects a challenge or a 401. They are listed
    // because refusing a request still costs a render, and on 2026-08-11 crawler
    // volume on this zone exhausted the KV free tier for a day. Shrinking the
    // advertised surface only helps with crawlers that read this file; the ones
    // that ignore it are handled at the Cloudflare edge instead.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
