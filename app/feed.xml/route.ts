// RSS 2.0 feed of works, generated from the R2 manifests — same source as the
// galleries, so there is nothing to keep in sync by hand. See app/llms.txt for
// the sibling machine-readable route and why a route (not a public/ file) is
// the only place this can live: public/ is baked into the deploy and can't be
// regenerated at request time.
import { type Artwork, MEDIA, getByMedium } from "@/app/lib/artworks";

const SITE = "https://alvamoor.com";

// Visitors, not crawlers, subscribe to this — but a feed reader polls on its
// own schedule regardless of how fresh the response is, so there is no reason
// to cut this below the manifest's own revalidate window.
const MAX_AGE = 60;

// Item titles and descriptions are English-only: RSS 2.0 has no per-item
// language tag (only a channel-wide <language>), so a single feed can't carry
// both locales without pairing every item with its translation. Picking one
// beats a feed that reads half English, half German at random.
const LOCALE = "en";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemFor(work: Artwork): string {
  const link = `${SITE}/${LOCALE}/works/${work.medium}/${work.base}`;
  const dims =
    work.widthCm > 0 && work.heightCm > 0
      ? `, ${work.widthCm}×${work.heightCm} cm`
      : "";
  const description = `${work.mediumLabel[LOCALE]}, ${work.year}${dims}`;
  // Only works added since this field existed carry a real timestamp — see the
  // addedAt comment in artworks.ts. Omitting <pubDate> is valid RSS 2.0; a
  // reader treats an undated item as "no known date", not "epoch zero".
  const pubDate = work.addedAt
    ? `\n      <pubDate>${new Date(work.addedAt).toUTCString()}</pubDate>`
    : "";

  return `    <item>
      <title>${escapeXml(work.title[LOCALE])}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(description)}</description>
      <enclosure url="${work.src}" type="image/webp" />${pubDate}
    </item>`;
}

export async function GET() {
  // One failed manifest must not take the whole feed down — matches
  // app/llms.txt/route.ts, which reads the same two manifests the same way.
  const works: Artwork[] = [];
  for (const medium of MEDIA) {
    try {
      works.push(...(await getByMedium(medium)));
    } catch {
      // Omitted rather than guessed at.
    }
  }

  // Newest first. Undated works (added before addedAt existed) have nothing to
  // sort by, so they keep their manifest order and sink behind every dated one
  // rather than jumping to the front or being placed at random.
  works.sort((a, b) => {
    if (a.addedAt && b.addedAt) return b.addedAt.localeCompare(a.addedAt);
    if (a.addedAt) return -1;
    if (b.addedAt) return 1;
    return 0;
  });

  const latestDated = works.find((w) => w.addedAt)?.addedAt;
  const lastBuildDate = new Date(latestDated ?? Date.now()).toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>alva moor — new works</title>
    <link>${SITE}/${LOCALE}/works</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>New paintings as they're added to alva moor's paper and canvas galleries.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${works.map(itemFor).join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": `public, max-age=${MAX_AGE}`,
    },
  });
}
