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

// One time zone for the whole site, stated in both places next-intl reads config
// from: `i18n/request.ts` for server rendering and `app/components/IntlProvider`
// for the browser. It has to be stated rather than inferred — left unset,
// next-intl falls back to the runtime's zone, which is UTC in the Worker and
// whatever the visitor's machine says in the browser, so the same date could
// render two ways across the hydration boundary. Leipzig/Berlin is where the work
// is made (`Contact.studio` in messages/), which makes it the zone a date here
// means.
export const TIME_ZONE = "Europe/Berlin";

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && routing.locales.some((l) => l === value);
}
