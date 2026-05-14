import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";

import { InfiniteScroll } from "@/app/components/InfiniteScroll";
import { ScrollHint } from "@/app/components/ScrollHint";
import { ScrollSpacer } from "@/app/components/ScrollSpacer";
import { StructuredData } from "@/app/components/StructuredData";
import { Link } from "@/i18n/navigation";
import { type Locale, isLocale, routing } from "@/i18n/routing";

import "../globals.css";
import styles from "./layout.module.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const backdrop = localFont({
  src: "../fonts/Direction-R9e63.otf",
  display: "swap",
  variable: "--font-backdrop",
});

export const viewport: Viewport = {
  themeColor: "#4a3829",
};

const SITE_URL = "https://alvamoor.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const path = locale === routing.defaultLocale ? "/" : `/${locale}`;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [
      l,
      l === routing.defaultLocale ? "/" : `/${l}`,
    ]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: t("name"),
    description: t("description"),
    applicationName: "alvamoor",
    authors: [{ name: "alva moor" }],
    creator: "alva moor",
    openGraph: {
      type: "website",
      siteName: "alvamoor",
      url: path,
      title: t("name"),
      description: t("description"),
      locale: locale === "de" ? "de_DE" : "en_US",
      alternateLocale: locale === "de" ? "en_US" : "de_DE",
    },
    twitter: {
      card: "summary_large_image",
      title: t("name"),
      description: t("description"),
    },
    alternates: {
      canonical: path,
      languages: { ...languages, "x-default": "/" },
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("Landing");
  const tSwitcher = await getTranslations("LocaleSwitcher");

  const year = new Date().getFullYear();

  return (
    <html lang={locale} className={`${sans.variable} ${backdrop.variable}`}>
      <body>
        <StructuredData locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <InfiniteScroll />
          <ScrollSpacer />
          <ScrollHint />
          <div className={styles.shell}>
            <header className={styles.top}>
              <span className={styles.status} aria-live="polite">
                <span className={styles.dot} aria-hidden="true" />
                {t("status")}
              </span>
              <nav
                aria-label={tSwitcher("label")}
                className={styles.localeSwitcher}
              >
                {routing.locales.map((l, i) => (
                  <span key={l}>
                    {i > 0 && (
                      <span className={styles.sep} aria-hidden="true">
                        /
                      </span>
                    )}
                    <Link
                      href="/"
                      locale={l}
                      className={`${styles.localeLink} ${l === locale ? styles.localeActive : ""}`}
                      aria-current={l === locale ? "page" : undefined}
                    >
                      {tSwitcher(l)}
                    </Link>
                  </span>
                ))}
              </nav>
            </header>

            {children}

            <footer className={styles.bottom}>
              <span className={styles.year}>{t("year", { year })}</span>
              <a
                href="https://instagram.com/alva.moor"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.instagram}
              >
                {t("follow")}
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </a>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
