import type { Metadata } from "next";

import { LegalPageView, legalMetadata } from "@/app/components/LegalPage";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata("datenschutz", locale);
}

export default async function DatenschutzPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <LegalPageView page="datenschutz" locale={locale} />;
}
