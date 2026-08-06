import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./Wordmark.module.css";

// The "alva moor" mark, top-left on every page — one instance in the locale
// layout, so it never moves or remounts as you navigate. It inherits its text
// colour from its surroundings, so it needs no per-page classes.
//
// Always a link home, never the page heading: each page provides its own h1
// (hidden on the landing and the works pages, visible on about and contact).
export async function Wordmark() {
  const t = await getTranslations("Landing");

  return (
    <Link href="/" className={styles.mark}>
      {t("name")}
    </Link>
  );
}
