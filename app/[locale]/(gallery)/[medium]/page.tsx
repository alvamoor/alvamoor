import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

import MediumNav from "../MediumNav";
import MediumGallery from "./MediumGallery";

export default async function MediumPage({
  params,
}: {
  params: Promise<{ locale: Locale; medium: string }>;
}) {
  const { locale, medium } = await params;
  setRequestLocale(locale);
  if (!isMedium(medium)) notFound();

  const t = await getTranslations("Gallery");
  const works = await getByMedium(medium);

  return (
    <>
      <MediumNav active={medium} />

      <MediumGallery
        works={works}
        locale={locale}
        labels={{
          sold: t("sold"),
          available: t("available"),
          close: t("close"),
          moreInfo: t("moreInfo"),
          prev: t("prev"),
          next: t("next"),
        }}
      />
    </>
  );
}
