import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

import MediumNav from "../MediumNav";
import MediumGallery from "./MediumGallery";

export default async function MediumPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; medium: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { locale, medium } = await params;
  setRequestLocale(locale);
  if (!isMedium(medium)) notFound();

  const t = await getTranslations("Gallery");
  const works = await getByMedium(medium);

  const { w } = await searchParams;
  const parsed = w === undefined ? NaN : Number(w);
  const open =
    Number.isInteger(parsed) && parsed >= 0 && parsed < works.length
      ? parsed
      : null;

  return (
    <>
      <MediumNav active={medium} />

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
