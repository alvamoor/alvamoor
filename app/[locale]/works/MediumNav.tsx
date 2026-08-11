"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./works.module.css";

// Canvas first: /works redirects here, so it is the section a visitor lands on.
const SECTIONS = ["canvas", "paper"] as const;

type Section = (typeof SECTIONS)[number];

// A client component for the same reason as Wordmark: next-intl's Link reads the
// current locale from a header when rendered on the server, which would make this
// route dynamic. On the client it comes from provider context.
export default function MediumNav({ active }: { active: Section }) {
  const t = useTranslations("Gallery");

  return (
    // data-chrome: what ScrollChrome measures for --subnav-h, so the frosted
    // veil above can cover this row too.
    <nav
      className={styles.mediumNav}
      aria-label={t("sections")}
      data-chrome="subnav"
    >
      {SECTIONS.map((section) => (
        <Link
          key={section}
          href={`/works/${section}`}
          className={`${styles.mediumNavLink} ${
            section === active ? styles.mediumNavActive : ""
          }`}
          aria-current={section === active ? "page" : undefined}
        >
          {t(section)}
        </Link>
      ))}
    </nav>
  );
}
