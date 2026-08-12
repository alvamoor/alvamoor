import type { Metadata, Viewport } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Backdrop } from "@/app/components/Backdrop";
import { IntlProvider } from "@/app/components/IntlProvider";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { ScrollChrome } from "@/app/components/ScrollChrome";
import { SiteNav } from "@/app/components/SiteNav";
import { StructuredData } from "@/app/components/StructuredData";
import { Wordmark } from "@/app/components/Wordmark";
import { backdrop, sans } from "@/app/fonts";
import "@/app/globals.css";
import { TILE_TINTS } from "@/app/lib/palette";
import { type Locale, isLocale, routing } from "@/i18n/routing";

import styles from "./shell.module.css";

const SITE_URL = "https://alvamoor.com";

export const viewport: Viewport = {
  // The tile the landing centres on at first paint (InfiniteScroll starts on the
  // pattern's origin), so the browser chrome matches the page it frames.
  themeColor: TILE_TINTS[0],
  width: "device-width",
  initialScale: 1,
  // Deliberately no maximumScale/userScalable: locking zoom fails WCAG 1.4.4,
  // and on a site whose subject is paintings, pinching into one is the point.
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const path = `/${locale}`;
  const description = t("description").replace(/\s+/g, " ").trim();
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}`]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: t("name"),
    description,
    applicationName: "alvamoor",
    authors: [{ name: "alva moor" }],
    creator: "alva moor",
    openGraph: {
      type: "website",
      siteName: "alvamoor",
      url: path,
      title: t("name"),
      description,
      locale: locale === "de" ? "de_DE" : "en_US",
      alternateLocale: locale === "de" ? "en_US" : "de_DE",
    },
    twitter: {
      card: "summary_large_image",
      title: t("name"),
      description,
    },
    alternates: {
      canonical: path,
      // x-default stays the bare "/" — the one unprefixed URL left, and now purely
      // a negotiator: it redirects to /en or /de by Accept-Language, which is
      // exactly what a crawler with no language preference should be handed.
      languages: { ...languages, "x-default": "/" },
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      ],
      // iOS uses a PNG apple-touch-icon (it ignores SVG here).
      apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
      shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// updates the year on change
export const revalidate = 86400;

// This is a root layout — there is no app/layout.tsx above it, so it owns <html>
// and <body> for the whole public site. /admin is a separate root with its own.
//
// That structure is the point: `lang` now comes from the [locale] segment, which
// this layout is handed as a param. It used to come from getLocale() in a root
// layout above, and next-intl implements that as headers().get(), which marked
// every route in the app dynamic — including /admin, which reads nothing. Params
// carry no such cost, so these pages can be prerendered and cached.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "Landing" });
  const year = new Date().getFullYear();

  return (
    <html lang={locale} className={`${sans.variable} ${backdrop.variable}`}>
      <body>
        <IntlProvider locale={locale} messages={messages}>
          <StructuredData locale={locale} />

          <div className={styles.page}>
            <Backdrop />

            <div className={styles.shell}>
              <ScrollChrome />

              <div className={styles.veil} aria-hidden="true" />
              <div className={styles.watermark} aria-hidden="true" />

              {/* data-chrome: what ScrollChrome measures for --header-h. */}
              <header className={styles.header} data-chrome="header">
                <div className={styles.headerTop}>
                  <Wordmark />
                  <LocaleSwitcher />
                </div>
                <SiteNav />
              </header>

              <main className={styles.main}>{children}</main>

              <footer className={styles.footer}>
                <span className={styles.year}>{t("year", { year })}</span>
              </footer>
            </div>
          </div>
        </IntlProvider>
      </body>
    </html>
  );
}
