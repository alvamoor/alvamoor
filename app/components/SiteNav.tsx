"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import styles from "./SiteNav.module.css";

// Primary navigation. One instance lives in the locale layout, so it is the same
// element on every route — including the landing, which is why there is no
// per-page variant. Like LocaleSwitcher it inherits its text colour.
//
// "works" points straight at /works/canvas rather than /works (which only
// redirects there), so the nav never costs an extra hop.
const ITEMS = [
  { key: "works", href: "/works/canvas", segment: "/works" },
  { key: "about", href: "/about", segment: "/about" },
  { key: "contact", href: "/contact", segment: "/contact" },
] as const;

export function SiteNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className={styles.nav}>
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.segment);
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch={false}
            className={`${styles.link}${active ? ` ${styles.active}` : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
