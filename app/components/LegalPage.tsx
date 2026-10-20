import type { Metadata } from "next";

import { type LegalPage, legalDocument } from "@/app/lib/legal";
import { type Locale, routing } from "@/i18n/routing";

import styles from "../[locale]/pages.module.css";

export function legalMetadata(page: LegalPage, locale: Locale): Metadata {
  return {
    title: legalDocument(page, locale).title,
    alternates: {
      canonical: `/${locale}/${page}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}/${page}`]),
      ),
    },
  };
}

export function LegalPageView({
  page,
  locale,
}: {
  page: LegalPage;
  locale: Locale;
}) {
  const doc = legalDocument(page, locale);

  return (
    <div className={`${styles.prose} ${styles.legal}`}>
      <h1 className={styles.legalTitle}>{doc.title}</h1>
      {doc.sections.map((s) => (
        <section key={s.heading} className={styles.legalSection}>
          <h2 className={styles.legalHeading}>{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className={styles.legalText}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
