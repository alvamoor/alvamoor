"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import styles from "./LocaleSwitcher.module.css";

// Shared language switcher. Links to the *current* path (locale-stripped, via
// next-intl's usePathname) with a swapped `locale`, so switching language keeps
// you on the page you're on instead of jumping home. It styles itself and
// inherits text colour from its surroundings (dark on gallery, light on home),
// dimming the inactive locale — so it needs no per-page classes.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className={styles.nav}>
      {routing.locales.map((option, i) => (
        <span key={option}>
          {i > 0 && (
            <span className={styles.sep} aria-hidden="true">
              {" / "}
            </span>
          )}
          <Link
            href={pathname}
            locale={option}
            prefetch={option === locale ? false : pathname.startsWith('/works') ? false : undefined}
            className={styles.link}
            aria-current={option === locale ? "page" : undefined}
          >
            {t(option)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
