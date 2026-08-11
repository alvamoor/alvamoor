"use client";

import { NextIntlClientProvider } from "next-intl";

import { TIME_ZONE } from "@/i18n/routing";

// A client boundary around next-intl's provider, and the reason is subtle enough
// to be worth stating: imported from a server component, `NextIntlClientProvider`
// resolves to next-intl's RSC wrapper, which fills in every prop you do not pass
// by calling a server API *without a locale* —
//
//   formats:  formats  === undefined ? await getFormats()  : formats,
//   now:      now      ?? await getConfigNow(),
//   timeZone: timeZone ?? await getTimeZone(),
//
// and each of those resolves the locale from a header. Passing locale and
// messages is not enough: three header reads remain, which is enough to mark
// every route in the site dynamic. Behind "use client" the same import resolves
// to the plain client provider, which has no server fallbacks to trip over.
//
// The time zone is fixed rather than read from the server's clock (which is UTC on
// Workers), so a date formatted on the server and one formatted in the browser
// agree.
export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}
