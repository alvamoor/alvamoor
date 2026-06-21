import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";

import { StructuredData } from "@/app/components/StructuredData";
import { type Locale, isLocale, routing } from "@/i18n/routing";

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <StructuredData locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
