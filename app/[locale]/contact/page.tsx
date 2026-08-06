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
  const t = await getTranslations({ locale, namespace: "Contact" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical:
        locale === routing.defaultLocale ? "/contact" : `/${locale}/contact`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/contact" : `/${l}/contact`,
        ]),
      ),
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  const email = t("email");

  return (
    <div className={styles.prose}>
      {/* No visible title — the nav is the heading. The h1 stays for the
          document outline and for screen readers. */}
      <h1 className={styles.srOnly}>{t("title")}</h1>
      <p className={styles.contactIntro}>{t("intro")}</p>

      <div className={styles.contactList}>
        <a href={`mailto:${email}`} className={styles.contactLink}>
          {email}
        </a>

        <a
          href="https://instagram.com/alva.moor"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.contactLink} ${styles.follow}`}
        >
          {t("instagram")}
          <span className={styles.arrow} aria-hidden="true">
            ↗
          </span>
        </a>

        <span className={styles.studio}>{t("studio")}</span>
      </div>
    </div>
  );
}
