import type { MetadataRoute } from "next";

import { MEDIA, getByMedium } from "@/app/lib/artworks";
import { routing } from "@/i18n/routing";

const SITE = "https://alvamoor.com";

const PATHS = ["", "/about", "/contact", "/works/canvas", "/works/paper"];

function urlFor(locale: string, path: string) {
  return `${SITE}/${locale}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, urlFor(l, path)]),
        ),
      },
    })),
  );

  // One entry per work per locale, so every /works/<medium>/<base> page is
  // discoverable without hand-submitting it in Search Console. Reuses the same
  // manifests the gallery renders from — a work added through /admin appears
  // here within REVALIDATE seconds, no redeploy.
  const worksByMedium = await Promise.all(MEDIA.map(getByMedium));

  const workEntries = worksByMedium.flatMap((works, i) => {
    const medium = MEDIA[i];
    return works.flatMap((work) => {
      const path = `/works/${medium}/${work.base}`;
      return routing.locales.map((locale) => ({
        url: urlFor(locale, path),
        lastModified: work.addedAt ? new Date(work.addedAt) : lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, urlFor(l, path)]),
          ),
        },
      }));
    });
  });

  return [...staticEntries, ...workEntries];
}
