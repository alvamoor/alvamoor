import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

const SITE = "https://alvamoor.com";

const PATHS = ["", "/about", "/contact", "/works/canvas", "/works/paper"];

function urlFor(locale: string, path: string) {
  return `${SITE}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PATHS.map((path) => ({
    url: urlFor(routing.defaultLocale, path),
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, urlFor(l, path)]),
      ),
    },
  }));
}
