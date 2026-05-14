import { getTranslations, setRequestLocale } from "next-intl/server";

import { InfiniteScroll } from "@/app/components/InfiniteScroll";
import { ScrollHint } from "@/app/components/ScrollHint";
import { ScrollSpacer } from "@/app/components/ScrollSpacer";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import styles from "./layout.module.css";

export default async function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Landing");
  const tSwitcher = await getTranslations("LocaleSwitcher");
  const year = new Date().getFullYear();

  return (
    <>
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
            {routing.locales.map((localeOption, index) => (
              <span key={localeOption}>
                {index > 0 && (
                  <span className={styles.sep} aria-hidden="true">
                    /
                  </span>
                )}
                <Link
                  href="/"
                  locale={localeOption}
                  className={`${styles.localeLink} ${localeOption === locale ? styles.localeActive : ""}`}
                  aria-current={localeOption === locale ? "page" : undefined}
                >
                  {tSwitcher(localeOption)}
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
    </>
  );
}
