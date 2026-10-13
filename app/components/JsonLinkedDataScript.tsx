import type { Artwork } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://alvamoor.com";

type JsonLdNode = { "@type": string; [key: string]: unknown };
type JsonLdGraph = { "@graph": JsonLdNode[] };

export const JsonLinkedDataScript = ({
  data,
  id = "structuredDataMarkup",
}: {
  data: JsonLdNode | JsonLdGraph;
  id?: string;
}) => {
  // `<` is escaped so a value containing "</script>" cannot close the tag early.
  const jsonString = JSON.stringify({
    "@context": "https://schema.org",
    ...data,
  }).replace(/</g, "\\u003c");

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
};

export function personJsonLd({
  jobTitle,
  statement,
}: {
  jobTitle: string;
  statement: string;
}): JsonLdNode {
  return {
    "@type": "Person",
    name: "alva moor",
    url: SITE_URL,
    jobTitle,
    description: statement,
    image: `${SITE_URL}/opengraph-image`,
    sameAs: ["https://instagram.com/alva.moor"],
    mainEntityOfPage: {
      "@type": "WebSite",
      "@id": SITE_URL,
      name: "alvamoor",
      inLanguage: ["en", "de"],
    },
  };
}

export function visualArtworkJsonLd(work: Artwork, locale: Locale): JsonLdNode {
  return {
    "@type": "VisualArtwork",
    name: work.title[locale],
    url: `${SITE_URL}/${locale}/works/${work.medium}/${work.base}`,
    image: work.src,
    description: work.description?.[locale],
    artMedium: work.mediumLabel[locale],
    dateCreated: String(work.year),
    width: {
      "@type": "QuantitativeValue",
      value: work.widthCm,
      unitCode: "CMT",
    },
    height: {
      "@type": "QuantitativeValue",
      value: work.heightCm,
      unitCode: "CMT",
    },
    creator: { "@type": "Person", name: "alva moor", url: SITE_URL },
  };
}
