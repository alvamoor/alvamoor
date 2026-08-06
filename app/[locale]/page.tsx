import { getTranslations } from "next-intl/server";

import { type Locale } from "@/i18n/routing";

import styles from "./pages.module.css";

export default async function Landing({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return (
    <div data-page="landing" className={styles.landing}>
      <h1 className={styles.srOnly}>{t("name")}</h1>
      <p className={styles.intro}>{t("description")}</p>
    </div>
  );
}
