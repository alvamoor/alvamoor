import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./gallery.module.css";

const SECTIONS = ["paper", "canvas"] as const;

type Section = "paper" | "canvas";

export default async function MediumNav({ active }: { active: Section }) {
  const t = await getTranslations("Gallery");

  return (
    <nav className={styles.mediumNav} aria-label={t("sections")}>
      {SECTIONS.map((section) => (
        <Link
          key={section}
          href={`/${section}`}
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
