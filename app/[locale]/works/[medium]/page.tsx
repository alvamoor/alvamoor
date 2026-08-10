import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import MediumNav from "../MediumNav";
import { WorksHeading } from "../WorksHeading";
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
        }}
      />
    </>
  );
}
