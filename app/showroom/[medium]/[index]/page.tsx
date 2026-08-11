import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  type Artwork,
  getByMedium,
  hasDimensions,
  isMedium,
  parseWorkIndex,
} from "@/app/lib/artworks";
import { BackLink } from "@/app/showroom/BackLink";

import { type ShowroomEntry, ShowroomView } from "./ShowroomView";

// Same shape as the single-work view one level of the site over: nothing is
// enumerated, because how many works exist is a property of the R2 manifest rather
// than of the build. The empty array is load-bearing — omit generateStaticParams
// and Next classifies the route dynamic, so it never enters the prerender manifest
// and nothing is ever stored. Returning no params puts it in with a blocking
// fallback: first request for an index renders it, and the window below applies
// from there.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

/** The reference body in the scene, quoted in metadata. */
const FIGURE_CM = 175;

/**
 * A cache key of the showroom's own, appended to every texture URL.
 *
 * Not a cache-buster. The bucket does send `Access-Control-Allow-Origin` now, and R2
 * sends `Vary: Origin` with it — but Cloudflare's edge does not vary on that header,
 * so one cached copy answers every request. Whichever request populates it decides
 * what everyone gets: a plain `<img>` on the works grid sends no `Origin`, R2
 * correctly answers with no CORS headers, and that response is then served to the
 * browser too — where WebGL refuses it, on a 200. Observed exactly that, on an entry
 * created after the policy was applied, while sibling images worked.
 *
 * Suffixing the URL gives textures a cache entry no non-CORS request ever touches:
 * three.js always sets crossOrigin, so this key can only ever be populated by a
 * request carrying an `Origin`, and therefore always holds a CORS-clean copy. It
 * costs one extra cached variant per work actually viewed in here.
 *
 * The cleaner fix is a Cloudflare Transform Rule on img.alvamoor.com setting
 * `Access-Control-Allow-Origin: *` unconditionally, so there is only one variant and
 * it is always usable. That needs zone config rather than code; this holds without it.
 */
const TEXTURE_KEY = "tex=1";

type Params = Promise<{ medium: string; index: string }>;

function toEntry(work: Artwork, index: number): ShowroomEntry {
  return {
    index,
    src: `${work.src}?${TEXTURE_KEY}`,
    widthCm: work.widthCm,
    heightCm: work.heightCm,
    title: work.title.en,
  };
}

/**
 * Every work in this medium that can be shown at scale, plus where the requested one
 * sits among them.
 *
 * The whole medium goes to the client so the room can step from one work to the next
 * without a navigation — a few kilobytes, against re-parsing three.js per work.
 *
 * Works with no recorded size are dropped rather than shown: 31 of 78 record 0 × 0,
 * because /admin's new-work form defaults both to zero and the manifest schema
 * permits it, and inventing a size for them would be worse than leaving them out.
 * Which is why an entry keeps its real `index` — the array position and the number in
 * the URL are different things once anything has been filtered out.
 */
async function resolve(params: Params) {
  const { medium, index } = await params;
  if (!isMedium(medium)) return null;

  const i = parseWorkIndex(index);
  if (i === null) return null;

  const all = await getByMedium(medium);
  const requested = all[i];
  if (!requested || !hasDimensions(requested)) return null;

  const works = all
    .map((work, at) => ({ work, at }))
    .filter(({ work }) => hasDimensions(work))
    .map(({ work, at }) => toEntry(work, at));

  return {
    medium,
    works,
    start: works.findIndex((entry) => entry.index === i),
    requested,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const resolved = await resolve(params);
  if (!resolved) return {};
  const { requested } = resolved;

  return {
    title: `${requested.title.en} at scale — alva moor`,
    description: `${requested.title.en}, ${requested.widthCm} × ${requested.heightCm} cm, shown at real size beside a ${FIGURE_CM} cm figure.`,
    // Not indexed: the work's own page is its canonical address, and 78 near-identical
    // room views would compete with it for no one's benefit. Still followed, so the
    // link back out counts.
    robots: { index: false, follow: true },
  };
}

export default async function ShowroomPage({ params }: { params: Params }) {
  const resolved = await resolve(params);
  if (!resolved) notFound();

  return (
    <>
      {/* English throughout: /showroom sits outside [locale] (see layout.tsx). */}
      <BackLink label="back" />

      <ShowroomView
        works={resolved.works}
        start={resolved.start}
        medium={resolved.medium}
      />
    </>
  );
}
