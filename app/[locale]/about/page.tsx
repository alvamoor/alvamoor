import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type Locale, routing } from "@/i18n/routing";

import styles from "../pages.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("title"),
    description: t("statement").slice(0, 200),
    alternates: {
      canonical:
        locale === routing.defaultLocale ? "/about" : `/${locale}/about`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/about" : `/${l}/about`,
        ]),
      ),
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return (
    <div className={styles.prose}>
      <h1 className={styles.srOnly}>{t("title")}</h1>
      <p className={styles.statement}>{t("statement").toLowerCase()}</p>
    </div>
  );
}
