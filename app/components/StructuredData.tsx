import { getTranslations } from "next-intl/server";

const SITE_URL = "https://alvamoor.com";

export async function StructuredData({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const tAbout = await getTranslations({ locale, namespace: "About" });

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "alva moor",
    url: SITE_URL,
    jobTitle: t("jobTitle"),
    description: tAbout("statement"),
    image: `${SITE_URL}/opengraph-image`,
    sameAs: ["https://instagram.com/alva.moor"],
    mainEntityOfPage: {
      "@type": "WebSite",
      "@id": SITE_URL,
      name: "alvamoor",
      inLanguage: ["en", "de"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
