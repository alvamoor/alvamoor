import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import pageStyles from "../../pages.module.css";
import MediumNav from "../MediumNav";
import styles from "../works.module.css";
import MediumGallery from "./MediumGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string }>;
}): Promise<Metadata> {
  const { locale, medium } = await params;
  if (!isMedium(medium)) return {};

  const t = await getTranslations({ locale, namespace: "Gallery" });
  const title = t("heading", { medium: t(medium).toLowerCase() });
  const path = `/works/${medium}`;

  return {
    title,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}${path}`]),
      ),
    },
  };
}

export default async function MediumPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; medium: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { locale, medium } = await params;
  if (!isMedium(medium)) notFound();

  const t = await getTranslations({ locale, namespace: "Gallery" });
  const works = await getByMedium(medium);

  const { w } = await searchParams;
  const parsed = w === undefined ? NaN : Number(w);
  const open =
    Number.isInteger(parsed) && parsed >= 0 && parsed < works.length
      ? parsed
      : null;

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

      {open === null ? (
        <MediumNav active={medium} />
      ) : (
        <Link href={`/works/${medium}`} className={styles.back} scroll={false}>
          {t("back")}
        </Link>
      )}

      <MediumGallery
        works={works}
        locale={locale}
        medium={medium}
        open={open}
        labels={{
          sold: t("sold"),
          available: t("available"),
          prev: t("prev"),
          next: t("next"),
        }}
      />
    </>
  );
}
