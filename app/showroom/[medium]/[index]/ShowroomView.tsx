"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/showroom/showroom.module.css";

import { SceneFrame } from "./SceneFrame";

/** One showable work: everything the room needs, and its address on the site. */
export type ShowroomEntry = {
  /** Position within the medium — the number in the URL, not in this array. */
  index: number;
  src: string;
  widthCm: number;
  heightCm: number;
  title: string;
};

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
  // The percentage is not padding. "About ankle height" alone reads as *where the
  // work hangs*, and everything hangs at 145 cm to the centre — so a 20 cm work
  // described as ankle height while floating at chest height invites exactly the
  // wrong reading. The ratio pins the sentence to the work's size.
  return `${landmark} height on the ${FIGURE_CM} cm figure beside it — about ${Math.round(ratio * 100)}% as tall.`;
}

/**
 * The showroom, with the whole medium loaded and one work on the wall.
 *
 * Stepping happens here rather than by navigating, and that is the point: the room
 * camera is a function of the viewport alone, so advancing swaps the painting while
 * the chair, the figure and the viewing distance stay exactly where they were. Two
 * works seen a second apart in an unchanged room compare far better than two page
 * loads do — and it skips re-parsing ~850 KB of three.js and rebuilding the scene
 * each time.
 *
 * A client component, but not a client-only one: it renders on the server like any
 * other, so the measurement panel is in the HTML before three.js exists. Only the
 * canvas below it is deferred.
 */
export function ShowroomView({
  works,
  start,
  medium,
}: {
  works: ShowroomEntry[];
  start: number;
  medium: string;
}) {
  const [at, setAt] = useState(start);
  const work = works[at] ?? works[0];

  // Wraps at both ends. The set is small, every work is worth reaching, and a
  // disabled button at the edge of a room is just a dead control.
  const step = useCallback(
    (dir: 1 | -1) => setAt((i) => (i + dir + works.length) % works.length),
    [works.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Keep the address bar honest without touching the router: replaceState rather
  // than push, so this stays one entry and the back button still leaves the showroom
  // in one press instead of walking back through every work you looked at. A Next
  // navigation would fetch and re-render the segment, which is the cost this whole
  // component exists to avoid.
  useEffect(() => {
    const url = `/showroom/${medium}/${work.index}`;
    if (window.location.pathname !== url) {
      window.history.replaceState(null, "", url);
    }
    document.title = `${work.title} at scale — alva moor`;
  }, [medium, work.index, work.title]);

  // The neighbours, so stepping is instant instead of showing an empty wall while a
  // texture downloads. Passed down rather than preloaded here: the preload call lives
  // in drei, and importing drei at this level would pull three.js out of the deferred
  // chunk and into the page.
  // Memoised on position: a fresh array each render would refire the preload effect
  // downstream on every state change.
  const neighbours = useMemo(
    () =>
      [
        works[(at + 1) % works.length]?.src,
        works[(at - 1 + works.length) % works.length]?.src,
      ].filter((src): src is string => !!src && src !== works[at]?.src),
    [works, at],
  );

  return (
    <>
      <SceneFrame
        work={{
          src: work.src,
          widthCm: work.widthCm,
          heightCm: work.heightCm,
          title: work.title,
        }}
        preload={neighbours}
      />

      {/* Server-rendered, so it is on screen before three.js arrives and present for
          anything that never runs it. */}
      <div className={styles.panel}>
        <span className={styles.title}>{work.title}</span>
        <span className={styles.size}>
          {work.widthCm} × {work.heightCm} cm
        </span>
        <span className={styles.compare}>{comparison(work.heightCm)}</span>
      </div>

      {works.length > 1 && (
        // DOM buttons rather than anything inside the canvas: they can be tabbed to,
        // read out, and hit on a phone, none of which is true of a mesh.
        <nav className={styles.nav} aria-label="Works in this room">
          <button
            type="button"
            className={styles.step}
            onClick={() => step(-1)}
            aria-label="Previous work"
          >
            ‹
          </button>
          {/* Position in the room, and it counts only works that record a size — so
              it deliberately disagrees with the index in the URL. */}
          <span className={styles.count} aria-live="polite">
            {at + 1} / {works.length}
          </span>
          <button
            type="button"
            className={styles.step}
            onClick={() => step(1)}
            aria-label="Next work"
          >
            ›
          </button>
        </nav>
      )}
    </>
  );
}
