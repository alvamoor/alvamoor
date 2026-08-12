import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [
      // A single work used to live at /works/<medium>?w=<n>, which is now
      // /works/<medium>/<n> — a route param, because reading searchParams opted
      // the whole route into dynamic rendering. Links shared before the move
      // still resolve.
      {
        source: "/:locale/works/:medium",
        has: [{ type: "query", key: "w", value: "(?<w>\\d+)" }],
        destination: "/:locale/works/:medium/:w",
        permanent: false,
      },
    ];
  },
  // No headers block. Both rules that lived here served the deleted 3D scene:
  // /artworks/:path* for its textures and /fonts/:path* for the Text3D typeface.
  // The site's own display face is loaded through next/font/local and served
  // fingerprinted out of _next/static/media, which is already immutable. Worth
  // knowing before adding one back: docs/code-audit-2026-08-10.md found this block
  // never fired anyway, because the Worker does not sit in front of static assets —
  // a public/_headers file is the mechanism that works on Cloudflare.
};

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
