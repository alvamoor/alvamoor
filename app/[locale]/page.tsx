import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

import styles from "./page.module.css";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <main className={styles.main}>
      <h1 className={styles.name}>{t("name")}</h1>
      <hr className={styles.rule} aria-hidden="true" />
      <p className={styles.tagline}>{t("tagline")}</p>
      <p className={styles.subtext}>{t("subtext")}</p>
    </main>
  );
}
