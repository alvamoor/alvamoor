import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { StaticBackdrop } from "@/app/components/StaticBackdrop";
import { Link } from "@/i18n/navigation";

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
  const year = new Date().getFullYear();

  return (
    <div className={styles.root}>
      <StaticBackdrop />

      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          {tLanding("name")}
        </Link>
        <LocaleSwitcher />
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
