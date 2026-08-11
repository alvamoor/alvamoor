import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getByMedium,
  hasDimensions,
  isMedium,
  parseWorkIndex,
} from "@/app/lib/artworks";
import { BackLink } from "@/app/showroom/BackLink";
import styles from "@/app/showroom/showroom.module.css";

import { SceneFrame } from "./SceneFrame";

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

/** The reference body in the scene. */
const FIGURE_CM = 175;

/**
 * Where a work of this height reaches on the 175 cm figure standing beside it.
 *
 * This sentence is not decoration. A canvas conveys nothing to a screen reader, so
 * for some visitors this text *is* the showroom — and even for everyone else, "about
 * chest height" lands faster than "130 cm" does.
 */
function comparison(heightCm: number): string {
  const ratio = heightCm / FIGURE_CM;
  if (heightCm >= FIGURE_CM) {
    return `Taller than the ${FIGURE_CM} cm figure beside it — about ${ratio.toFixed(1)}× its height.`;
  }
  const landmark =
    heightCm < 35
      ? "ankle"
      : heightCm < 60
        ? "knee"
        : heightCm < 100
          ? "hip"
          : heightCm < 140
            ? "chest"
            : "shoulder";
  return `About ${landmark} height on the ${FIGURE_CM} cm figure beside it.`;
}

type Params = Promise<{ medium: string; index: string }>;

/** The work at this address, or null if there is not one that can be shown at scale. */
async function resolveWork(params: Params) {
  const { medium, index } = await params;
  if (!isMedium(medium)) return null;

  const i = parseWorkIndex(index);
  if (i === null) return null;

  const work = (await getByMedium(medium))[i];
  // A work with no recorded size has no business in a room built to show size. Of
  // 78 works, 31 record 0 × 0 — /admin's new-work form defaults both to zero and
  // the manifest schema permits it — and inventing a size for them would be worse
  // than leaving them out.
  if (!work || !hasDimensions(work)) return null;

  return work;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const work = await resolveWork(params);
  if (!work) return {};

  return {
    title: `${work.title.en} at scale — alva moor`,
    description: `${work.title.en}, ${work.widthCm} × ${work.heightCm} cm, shown at real size beside a ${FIGURE_CM} cm figure.`,
    // Not indexed: the work's own page is its canonical address, and 78 near-identical
    // room views would compete with it for no one's benefit. Still followed, so the
    // link back out counts.
    robots: { index: false, follow: true },
  };
}

export default async function ShowroomPage({ params }: { params: Params }) {
  const work = await resolveWork(params);
  if (!work) notFound();

  return (
    <>
      {/* English throughout: /showroom sits outside [locale] (see layout.tsx). */}
      <BackLink label="back" />

      <SceneFrame
        work={{
          src: work.src,
          widthCm: work.widthCm,
          heightCm: work.heightCm,
          title: work.title.en,
        }}
      />

      {/* Server-rendered, so it is on screen before three.js arrives and present
          for anything that never runs it. */}
      <div className={styles.panel}>
        <span className={styles.title}>{work.title.en}</span>
        <span className={styles.size}>
          {work.widthCm} × {work.heightCm} cm
        </span>
        <span className={styles.compare}>{comparison(work.heightCm)}</span>
      </div>
    </>
  );
}
