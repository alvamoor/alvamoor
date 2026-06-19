import { getTranslations, setRequestLocale } from "next-intl/server";

import { StaticBackdrop } from "@/app/components/StaticBackdrop";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import styles from "./gallery.module.css";

export default async function GalleryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Gallery");
  const tLanding = await getTranslations("Landing");
  const tSwitcher = await getTranslations("LocaleSwitcher");
  const year = new Date().getFullYear();

  return (
    <div className={styles.root}>
      <StaticBackdrop />

      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          {tLanding("name")}
        </Link>
        <nav aria-label={tSwitcher("label")}>
          {routing.locales.map((option, i) => (
            <span key={option}>
              {i > 0 && <span aria-hidden="true"> / </span>}
              <Link
                href="/"
                locale={option}
                aria-current={option === locale ? "page" : undefined}
                style={{
                  color: option === locale ? "var(--v2-fg)" : undefined,
                }}
              >
                {tSwitcher(option)}
              </Link>
            </span>
          ))}
        </nav>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>© {year}</span>
        <a
          href="https://instagram.com/alva.moor"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.follow}
        >
          {t("follow")}
          <span className={styles.arrow} aria-hidden="true">
            ↗
          </span>
        </a>
      </footer>
    </div>
  );
}
