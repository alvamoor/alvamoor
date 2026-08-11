import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium, parseWorkIndex } from "@/app/lib/artworks";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import { WorksHeading } from "../../WorksHeading";
import MediumGallery from "../MediumGallery";

// Nothing is enumerated here, unlike the gallery one level up: how many works
// exist is a property of the R2 manifest at request time, not of the build, so a
// work added today should be linkable without a redeploy.
//
// The empty array is doing real work all the same, and `revalidate` below is a
// no-op without it. Omit generateStaticParams entirely and Next classifies the
// route as dynamic — it never enters the prerender manifest, so every request
// re-renders and nothing is stored. Returning no params instead puts the route in
// the manifest with a blocking fallback: the first request for an index renders it,
// the result is cached, and the window below applies from there.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string; index: string }>;
}): Promise<Metadata> {
  const { locale, medium, index } = await params;
  if (!isMedium(medium)) return {};

  const i = parseWorkIndex(index);
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
  const i = parseWorkIndex(index);
  if (i === null) notFound();
  if (i >= works.length) redirect({ href: `/works/${medium}`, locale });

  return (
    <>
      <WorksHeading locale={locale} medium={medium} />

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
          back: t("back"),
          atScale: t("atScale"),
        }}
      />
    </>
  );
}
