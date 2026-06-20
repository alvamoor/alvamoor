import { getTranslations, setRequestLocale } from "next-intl/server";

import { InfiniteScroll } from "@/app/components/InfiniteScroll";
import { TileField } from "@/app/components/TileField";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

import styles from "./landing.module.css";

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Landing");
  const tSwitcher = await getTranslations("LocaleSwitcher");
  const tHome = await getTranslations("Home");
  const year = new Date().getFullYear();

  return (
    <>
      <InfiniteScroll />
      <TileField />

      <div className={styles.shell}>
        <header className={styles.top}>
          <span aria-hidden="true" />
          <nav
            aria-label={tSwitcher("label")}
            className={styles.localeSwitcher}
          >
            {routing.locales.map((option, i) => (
              <span key={option}>
                {i > 0 && (
                  <span className={styles.sep} aria-hidden="true">
                    /
                  </span>
                )}
                <Link
                  href="/"
                  locale={option}
                  className={`${styles.localeLink} ${option === locale ? styles.localeActive : ""}`}
                  aria-current={option === locale ? "page" : undefined}
                >
                  {tSwitcher(option)}
                </Link>
              </span>
            ))}
          </nav>
        </header>

        <main className={styles.center}>
          <h1 className={styles.name}>{t("name")}</h1>
          <p className={styles.tagline}>
            {tHome.rich("intro", {
              link: (chunks) => (
                <Link href="/paper" className={styles.taglineLink}>
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </main>

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
