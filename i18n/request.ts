import { getRequestConfig } from "next-intl/server";

import { TIME_ZONE, isLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is a lazy getter: when a caller passes an explicit locale —
  // which every call in app/ does — it resolves to that without touching a
  // header. It only falls back to reading one when nobody said which locale was
  // meant, and a header read marks the whole site dynamic.
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // The server half of the pair; the client half is the `timeZone` prop in
    // app/components/IntlProvider.tsx. See i18n/routing.ts for why it is fixed.
    timeZone: TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
