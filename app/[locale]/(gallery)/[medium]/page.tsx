import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getByMedium, isMedium } from "@/app/lib/artworks";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import MediumNav from "../MediumNav";
import styles from "../gallery.module.css";
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
      {open === null ? (
        <MediumNav active={medium} />
      ) : (
        <Link href={`/${medium}`} className={styles.back} scroll={false}>
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
