import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { MEDIA, getByMedium, isMedium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import MediumNav from "../MediumNav";
import { WorksHeading } from "../WorksHeading";
import MediumGallery from "./MediumGallery";

// Prerendered, then revalidated every 60s. That window is what keeps "add a work,
// no redeploy" true: the build bakes whatever R2 held at the time, and the first
// request after a minute picks up anything added since. (If the bucket were
// unreachable during a build the gallery would ship empty, and repair itself the
// same way.)
export const revalidate = 60;

// The two media are compile-time constants. This runs once per locale the parent
// layout generates, so it yields four pages.
export function generateStaticParams() {
  return MEDIA.map((medium) => ({ medium }));
}

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

// The grid. A single work lives at ./[index] rather than behind a `?w=` search
// param: reading searchParams here opted the whole route into dynamic rendering,
// where a route param does not, so this page can be cached once the root layout
// stops reading a header (see docs/code-audit-2026-08-10.md).
export default async function MediumPage({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string }>;
}) {
  const { locale, medium } = await params;
  if (!isMedium(medium)) notFound();

  const t = await getTranslations({ locale, namespace: "Gallery" });
  const works = await getByMedium(medium);

  return (
    <>
      <WorksHeading locale={locale} medium={medium} />

      <MediumNav active={medium} />

      <MediumGallery
        works={works}
        locale={locale}
        medium={medium}
        open={null}
        labels={{
          sold: t("sold"),
          available: t("available"),
          prev: t("prev"),
          next: t("next"),
          back: t("back"),
        }}
      />
    </>
  );
}
