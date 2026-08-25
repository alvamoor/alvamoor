import { getTranslations } from "next-intl/server";

import type { Medium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

import pageStyles from "../pages.module.css";

// The chrome both works views need: the grid at /works/<medium> and the single
// work at /works/<medium>/<base>. Identical on each, so it lives here rather
// than twice.
export async function WorksHeading({
  locale,
  medium,
}: {
  locale: Locale;
  medium: Medium;
}) {
  const t = await getTranslations({ locale, namespace: "Gallery" });

  return (
    <>
      {/* The design shows no page title, but the page still needs a heading. */}
      <h1 className={pageStyles.srOnly}>
        {t("heading", { medium: t(medium).toLowerCase() })}
      </h1>

      {/* Marks the works pages for the shell: they carry the subnav, so the
          frosted veil spans header + subnav and the header tightens underneath.
          The ground itself is the shared tinted field — every page has the same
          one. An empty marker rather than a wrapper, so the flex chain the
          scroller depends on stays intact. */}
      <div data-page="works" aria-hidden="true" />
    </>
  );
}
