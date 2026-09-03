"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./pages.module.css";

export default function LocaleNotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className={styles.prose}>
      <h1 className={styles.statement}>{t("heading")}</h1>
      <p className={styles.intro}>{t("body")}</p>
      <p className={styles.intro}>
        <Link href="/works/paper" className={styles.contactLink}>
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
