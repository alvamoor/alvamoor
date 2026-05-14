import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

const SITE = "https://alvamoor.com";

function urlFor(locale: string) {
  return locale === routing.defaultLocale ? `${SITE}/` : `${SITE}/${locale}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, urlFor(l)]),
  );

  return [
    {
      url: urlFor(routing.defaultLocale),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages },
    },
  ];
}
