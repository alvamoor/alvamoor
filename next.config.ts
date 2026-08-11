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
  async headers() {
    return [
      {
        source: "/artworks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
