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

import { ScrollSpacer } from "@/app/components/ScrollSpacer";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  return {
    title: t("name"),
    description: t("tagline"),
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
        <NextIntlClientProvider messages={messages}>
          <ScrollSpacer />
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
