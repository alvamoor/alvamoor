import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import styles from "./page.module.css";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Gallery");

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.placeholder}>{t("placeholder")}</p>
      <Link href="/" className={styles.back}>
        <span className={styles.arrow} aria-hidden="true">
          ←
        </span>
        {t("back")}
      </Link>
    </main>
  );
}
