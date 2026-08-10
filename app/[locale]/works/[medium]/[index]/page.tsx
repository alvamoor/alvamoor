import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import { WorksHeading } from "../../WorksHeading";
import styles from "../../works.module.css";
import MediumGallery from "../MediumGallery";

/** The index as a non-negative integer, or null if the segment is not one. */
function parseIndex(index: string): number | null {
  // Number() would accept "3.0", " 3" and "3e0"; the URL should carry the digits
  // and nothing else, so that a work has exactly one address.
  if (!/^\d+$/.test(index)) return null;
  const n = Number(index);
  return Number.isSafeInteger(n) ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string; index: string }>;
}): Promise<Metadata> {
  const { locale, medium, index } = await params;
  if (!isMedium(medium)) return {};

  const i = parseIndex(index);
  if (i === null) return {};

  const works = await getByMedium(medium);
  const work = works[i];
  if (!work) return {};

  const t = await getTranslations({ locale, namespace: "Gallery" });
  const path = `/works/${medium}/${i}`;

  // The work's own title, which is the point of a per-work URL: a shared link
  // now says which painting it is.
  return {
    title: `${work.title[locale]} — ${t(medium).toLowerCase()}`,
    description: work.description?.[locale],
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}${path}`]),
      ),
    },
    openGraph: {
      title: work.title[locale],
      description: work.description?.[locale],
      images: [{ url: work.src }],
    },
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string; index: string }>;
}) {
  const { locale, medium, index } = await params;
  if (!isMedium(medium)) notFound();

  const t = await getTranslations({ locale, namespace: "Gallery" });
  const works = await getByMedium(medium);

  // An index that is out of range is not a 404 — works get reordered and
  // removed, so an old shared link pointing past the end should land on the
  // grid rather than on an error. A segment that is not a number at all is a
  // genuine 404: nothing ever generated that URL.
  const i = parseIndex(index);
  if (i === null) notFound();
  if (i >= works.length) redirect({ href: `/works/${medium}`, locale });

  return (
    <>
      <WorksHeading locale={locale} medium={medium} />

      {/* Stands in for the section nav in this view — same row, same size. */}
      <Link href={`/works/${medium}`} className={styles.back} scroll={false}>
        {t("back")}
      </Link>

      <MediumGallery
        works={works}
        locale={locale}
        medium={medium}
        open={i}
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
