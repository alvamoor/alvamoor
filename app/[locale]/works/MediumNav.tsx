import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./works.module.css";

// Canvas first: /works redirects here, so it is the section a visitor lands on.
const SECTIONS = ["canvas", "paper"] as const;

type Section = (typeof SECTIONS)[number];

export default async function MediumNav({ active }: { active: Section }) {
  const t = await getTranslations("Gallery");

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
      {/* Third door out to the 3D virtual gallery (a different kind of route).
      <a href="/gallery" className={styles.mediumNavLink}>
        {t("virtualGallery")}
      </a>
      */}
    </nav>
  );
}
