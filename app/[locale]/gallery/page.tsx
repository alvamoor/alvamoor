import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import NavDots from "./NavDots";
import SceneWrapper from "./SceneWrapper";
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
    <>
      <SceneWrapper />
      <div className={styles.dirt} aria-hidden="true" />
      <Link href="/" className={styles.back}>
        <span className={styles.arrow} aria-hidden="true">
          ←
        </span>
        {t("back")}
      </Link>
      <NavDots />
    </>
  );
}
