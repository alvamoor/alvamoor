"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./Wordmark.module.css";

// The "alva moor" mark, top-left on every page — one instance in the locale
// layout, so it never moves or remounts as you navigate. It inherits its text
// colour from its surroundings, so it needs no per-page classes.
//
// Always a link home, never the page heading: each page provides its own h1
// (hidden on the landing and the works pages, visible on about and contact).
//
// A client component, and it has to be. next-intl's Link resolves the current
// locale for its prefix by calling the locale getter *unconditionally* — and in a
// Server Component that getter reads a header, which marks every route dynamic.
// Rendered on the client the locale comes from the provider's context instead.
// Passing a `locale` prop does not avoid it: the getter is called before the prop
// is consulted. Same reason MediumNav is a client component.
export function Wordmark() {
  const t = useTranslations("Landing");

  return (
    <Link href="/" className={styles.mark}>
      {t("name")}
    </Link>
  );
}
