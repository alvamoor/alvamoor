import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  localePrefix: "always",
  // next-intl v4 made the locale cookie a session cookie by default, which would
  // drop a visitor's language choice when they close the browser. Keep the v3
  // behaviour: remember it for a year. `app/gallery/page.tsx` also reads
  // NEXT_LOCALE to decide where its back link points.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && routing.locales.some((l) => l === value);
}
