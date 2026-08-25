// /llms.txt, generated from the R2 manifests rather than written by hand.
//
// It was a hand-written file in public/ for one day and was wrong by the end of
// it: it claimed 14 canvas and 31 paper works while R2 held 25 and 81. That is the
// same staleness the works routes are built to avoid — /admin writes the manifest
// and the site reflects it — so this reads the manifest too.
//
// A route rather than a file, and there was no third option. public/ is baked into
// the deploy, so nothing can rewrite it at runtime; writing a generated copy to R2
// on upload would still need a route here to serve it at alvamoor.com/llms.txt,
// and would add a write that can fail and leave the two out of step. Deriving it
// on read has no such state.
//
// IMPORTANT: there must be no public/llms.txt. Workers Assets answers a matching
// static asset without invoking the Worker, so a leftover file would win this
// route and pin the old counts forever — silently, because it would still return
// 200 with plausible content.
import { getTranslations } from "next-intl/server";

import {
  type Artwork,
  MEDIA,
  type Medium,
  getByMedium,
} from "@/app/lib/artworks";

const SITE = "https://alvamoor.com";

// Crawlers, not visitors, so an hour of staleness is nothing — but it does stop a
// badly-behaved fetcher turning this into a per-request pair of R2 reads. Set here
// rather than in public/_headers, which only applies to static assets.
const MAX_AGE = 3600;

type Summary = {
  medium: Medium;
  count: number;
  years: string;
  labels: string[];
  dimensions: string | null;
  sold: number;
};

function summarise(medium: Medium, works: Artwork[]): Summary {
  const years = works.map((w) => w.year).filter(Boolean);
  const lo = Math.min(...years);
  const hi = Math.max(...years);

  // Dimensions are optional in practice: 10 of the 81 paper works carried 0×0 when
  // this was written, so a range built from every entry would read "0–150".
  const sized = works.filter((w) => w.widthCm > 0 && w.heightCm > 0);
  const widths = sized.map((w) => w.widthCm);
  const heights = sized.map((w) => w.heightCm);

  return {
    medium,
    count: works.length,
    years: years.length === 0 ? "" : lo === hi ? `${lo}` : `${lo}–${hi}`,
    labels: [...new Set(works.map((w) => w.mediumLabel.en))].sort(),
    dimensions:
      sized.length === 0
        ? null
        : `${Math.min(...widths)}–${Math.max(...widths)} cm wide by ${Math.min(...heights)}–${Math.max(...heights)} cm high`,
    sold: works.filter((w) => w.status === "sold").length,
  };
}

function describe(s: Summary): string {
  const label = s.medium === "canvas" ? "canvas" : "paper";
  const parts = [`${s.count} works`];
  if (s.years) parts.push(s.years);
  parts.push(s.labels.join(", ").toLowerCase());
  if (s.dimensions) parts.push(s.dimensions);
  if (s.sold > 0) parts.push(`${s.sold} sold`);

  return [
    `- [Works on ${label} (EN)](${SITE}/en/works/${s.medium}) — ${parts.join(". ")}.`,
    `- [Werke auf ${s.medium === "canvas" ? "Leinwand" : "Papier"} (DE)](${SITE}/de/works/${s.medium})`,
  ].join("\n");
}

export async function GET() {
  const t = await getTranslations({ locale: "en", namespace: "Landing" });
  const tAbout = await getTranslations({ locale: "en", namespace: "About" });
  const tContact = await getTranslations({
    locale: "en",
    namespace: "Contact",
  });

  // One failed manifest read must not take the whole file down: a section that
  // cannot be summarised is omitted, and the rest still describes the work.
  const summaries: Summary[] = [];
  for (const medium of MEDIA) {
    try {
      const works = await getByMedium(medium);
      if (works.length > 0) summaries.push(summarise(medium, works));
    } catch {
      // Omitted rather than guessed at.
    }
  }
  // canvas before paper, matching the nav and the works redirect.
  summaries.sort((a, b) =>
    a.medium === "canvas" ? -1 : b.medium === "canvas" ? 1 : 0,
  );

  const body = `# ${t("name")}

> ${t("jobTitle")}. ${t("description").replace(/\n/g, " ")}
> Studio in ${tContact("studio")}.

${tAbout("statement")
  .replace(/\s*\n\s*/g, "\n\n")
  .trim()}

The site is bilingual. Every page exists under both \`/en\` and \`/de\`.

## Works

${summaries.map(describe).join("\n") || "- Sections are temporarily unavailable."}
- [All works (EN)](${SITE}/en/works) · [Alle Werke (DE)](${SITE}/de/works)

Individual works live at \`/{locale}/works/{medium}/{base}\`, where \`base\` names
the work and stays with it: adding or reordering works does not repoint these
URLs, so a single work is safe to cite.

## About

- [About — artist statement (EN)](${SITE}/en/about)
- [Über — Künstlerstatement (DE)](${SITE}/de/about)

## Contact

- [Contact (EN)](${SITE}/en/contact) · [Kontakt (DE)](${SITE}/de/contact)
- ${tContact("intro")} ${tContact("email")}
- Studio: ${tContact("studio")}

## Usage

Text and images on this site are © ${t("name")}, all rights reserved.

This file exists so that assistants can describe and cite the work accurately from
a single request, instead of crawling the site. Reproduction of the images —
including use as training data — is not permitted. Automated crawling of pages
beyond this file is disallowed; see [${SITE}/robots.txt](${SITE}/robots.txt).
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
}
