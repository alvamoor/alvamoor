import { getTranslations, setRequestLocale } from "next-intl/server";

import { InfiniteScroll } from "@/app/components/InfiniteScroll";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { TileField } from "@/app/components/TileField";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";

import { NameReveal } from "./NameReveal";
import styles from "./landing.module.css";

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Landing");
  const tHome = await getTranslations("Home");
  const year = new Date().getFullYear();

  return (
    <>
      <InfiniteScroll>
        <TileField />
      </InfiniteScroll>

      <div className={styles.shell}>
        <header className={styles.top}>
          <span aria-hidden="true" />
          <LocaleSwitcher />
        </header>

        <main className={styles.center}>
          <NameReveal
            name={t("name")}
            about={t("about")}
            description={t("description")}
            close={t("close")}
          />
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
