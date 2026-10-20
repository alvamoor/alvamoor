"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import styles from "../pages.module.css";

/**
 * The works pages (grid and single work) throw when the manifest cannot be read,
 * so that nothing is cached for the failed render. This is where that lands.
 *
 * It asks for a full reload rather than calling reset(): reset() only re-renders
 * the segment from the client's cached payload, while a reload asks the server
 * again — which is what a failed manifest read needs.
 */
export default function WorksError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const t = useTranslations("WorksError");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("works error", error.digest ?? "(no digest)", error.message);
  }, [error]);

  return (
    <div className={styles.prose}>
      <h1 className={styles.statement}>{t("heading")}</h1>
      <p className={styles.intro}>{t("body")}</p>
      <p className={styles.intro}>
        <button
          type="button"
          className={styles.contactLink}
          onClick={() => window.location.reload()}
        >
          {t("reload")}
        </button>
      </p>
    </div>
  );
}
