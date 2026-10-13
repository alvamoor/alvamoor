"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  type ManifestEntry,
  type Medium,
  altFor,
  tileId,
  toArtwork,
} from "@/app/lib/artworks";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import styles from "../../works.module.css";

type Labels = {
  prev: string;
  next: string;
  back: string;
};

type Props = {
  entries: ManifestEntry[];
  /** The work the URL names. */
  base: string;
  locale: Locale;
  labels: Labels;
  medium: Medium;
  /** What follows the work's title in the tab title, e.g. "paper". */
  titleSuffix: string;
};

/** Debounce delay: how long the scroller has to be still before a swipe counts as landed. */
const SCROLL_DEBOUNCE_MS = 120;

/** Works rendered on each side of the current one once the page is live. */
const RADIUS = 2;

export default function WorkScroller({
  entries,
  base,
  locale,
  labels,
  medium,
  titleSuffix,
}: Props) {
  const router = useRouter();

  const works = useMemo(
    () => entries.map((entry) => toArtwork(medium, entry)),
    [entries, medium],
  );

  // Which work is showing. It starts at the one the URL names and from then on
  // the scroller owns it: a swipe changes this state and rewrites the address bar
  // in place, with no request to the server. That is what keeps a quick run of
  // swipes from waiting on a render per step.
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      entries.findIndex((e) => e.base === base),
    ),
  );
  const [seenBase, setSeenBase] = useState(base);
  if (seenBase !== base) {
    // The page was handed a different work (a real navigation, not a swipe).
    setSeenBase(base);
    setIndex(
      Math.max(
        0,
        entries.findIndex((e) => e.base === base),
      ),
    );
  }

  // The server renders three works (see AGENTS.md); the rest of the window only
  // appears once the page is live, so the render cost stays what it was.
  const [radius, setRadius] = useState(1);
  useEffect(() => setRadius(RADIUS), []);

  const lo = Math.max(0, index - radius);
  const hi = Math.min(works.length - 1, index + radius);
  const slides = works.slice(lo, hi + 1);
  const current = works[index];
  const prev = works[index - 1] ?? null;
  const next = works[index + 1] ?? null;

  const [openId, setOpenId] = useState<string | null>(null);
  const [imageBox, setImageBox] = useState<{ w: number; h: number } | null>(
    null,
  );
  const openImgRef = useRef<HTMLImageElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Land on the current work whenever the window moves. Slides come and go at the
  // edges of the window, so the offset of the current one changes; this runs
  // before paint, so the swap is invisible. It must not be an animated move:
  // assigning scrollLeft honours `scroll-behavior: smooth`, which would animate
  // back across the slide just left. Instant here, smooth left in place for the
  // arrows.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const behavior = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = (index - lo) * el.clientWidth;
    el.style.scrollBehavior = behavior;
  }, [index, lo]);

  // Swiping to a neighbour changes the state and the address bar, nothing more.
  // replaceState rather than a push: a swipe is not a place to come back to, so
  // Back leaves the work for the overview instead of stepping through every
  // painting looked at. Next picks the change up, so usePathname and the language
  // switch follow along.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;

    const settle = () => {
      if (!el.clientWidth) return;
      const landed = works[lo + Math.round(el.scrollLeft / el.clientWidth)];
      if (!landed || landed.id === works[index].id) return;

      setIndex(works.indexOf(landed));
      setOpenId(null);
      setImageBox(null);
      window.history.replaceState(
        null,
        "",
        `/${locale}/works/${medium}/${landed.base}`,
      );
      document.title = `${landed.title[locale]} — ${titleSuffix}`;
    };

    // Scroll end rather than scroll: a swipe fires dozens of these on the way,
    // and only where it stops is a work.
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SCROLL_DEBOUNCE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [works, index, lo, locale, medium, titleSuffix]);

  // The arrows stay real links, so they middle-click and right-click like any
  // other, but a plain click scrolls to the neighbour instead of loading it.
  function step(direction: -1 | 1) {
    return (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
        return;
      const el = scrollerRef.current;
      if (!el) return;
      e.preventDefault();
      el.scrollTo({ left: el.scrollLeft + direction * el.clientWidth });
    };
  }

  const backHref = `/works/${medium}#${tileId(current.base)}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openId) setOpenId(null);
      else router.push(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, router, backHref]);

  useEffect(() => {
    if (!openId) return;
    const measure = () => {
      const el = openImgRef.current;
      if (el) setImageBox({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [openId]);

  function toggle(id: string) {
    setImageBox(null);
    setOpenId((cur) => (cur === id ? null : id));
  }

  // data-view is the hook the shell watches to lock itself to the viewport for
  // this one view — see shell.module.css.
  return (
    <>
      {/* The single-work view's stand-in for the section nav. It lives here, not
          in the page, because next-intl's Link reads a header when rendered on
          the server — see MediumNav. Still a sibling of the scroller, so the
          flex chain the locked view depends on is unchanged. */}
      <Link href={backHref} className={styles.back}>
        {labels.back}
      </Link>

      <div className={styles.scrollerWrap} data-view="scroller">
        {prev && (
          <Link
            href={`/works/${medium}/${prev.base}`}
            className={`${styles.navArrow} ${styles.navArrowLeft}`}
            aria-label={labels.prev}
            prefetch={false}
            onClick={step(-1)}
          >
            ‹
          </Link>
        )}

        <div className={styles.works} data-medium={medium} ref={scrollerRef}>
          {slides.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.work}
              onClick={() => toggle(a.id)}
              aria-pressed={openId === a.id}
            >
              <span className={styles.frame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={openId === a.id ? openImgRef : null}
                  className={styles.image}
                  src={a.src}
                  srcSet={a.webpSrcSet}
                  sizes="100vw"
                  alt={altFor(a, locale)}
                  // All eagerly: the works either side are here to be swiped
                  // to, and having them downloaded in advance is the whole point
                  // of rendering them at all.
                  loading="eager"
                  fetchPriority={a.id === current.id ? "high" : "auto"}
                  decoding="async"
                />
                {openId === a.id && imageBox && (
                  <span
                    className={styles.caption}
                    style={{
                      width: imageBox.w,
                      maxHeight: imageBox.h,
                      top: `calc(50% + ${imageBox.h / 2}px)`,
                      left: "50%",
                    }}
                  >
                    <span className={styles.captionTitle}>
                      {a.title[locale]}
                    </span>
                    {a.description?.[locale] && (
                      <span className={styles.captionDescription}>
                        {a.description[locale]}
                      </span>
                    )}
                    <span className={styles.captionSpec}>
                      {a.mediumLabel[locale]} · {a.widthCm} × {a.heightCm} cm ·{" "}
                      {a.year}
                    </span>
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {next && (
          <Link
            href={`/works/${medium}/${next.base}`}
            className={`${styles.navArrow} ${styles.navArrowRight}`}
            aria-label={labels.next}
            prefetch={false}
            onClick={step(1)}
          >
            ›
          </Link>
        )}
      </div>
    </>
  );
}
