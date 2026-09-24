import { type Artwork, MEDIA, getByMedium } from "@/app/lib/artworks";

const SITE = "https://alvamoor.com";

const MAX_AGE = 60;

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
  const works: Artwork[] = [];
  for (const medium of MEDIA) {
    try {
      works.push(...(await getByMedium(medium)));
    } catch {
      // ignore
    }
  }

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
