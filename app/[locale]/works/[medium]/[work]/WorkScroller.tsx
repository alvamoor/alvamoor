"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { type Artwork, tileId } from "@/app/lib/artworks";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import styles from "../../works.module.css";

type Labels = {
  prev: string;
  next: string;
  back: string;
};

type Props = {
  prev: Artwork | null;
  current: Artwork;
  next: Artwork | null;
  locale: Locale;
  labels: Labels;
  medium: string;
};

/** How long the scroller has to be still before a swipe counts as landed. */
const SETTLE_MS = 120;

export default function WorkScroller({
  prev,
  current,
  next,
  locale,
  labels,
  medium,
}: Props) {
  const router = useRouter();

  // Two slides at the ends of the medium, three everywhere else.
  const slides = [prev, current, next].filter((w): w is Artwork => w !== null);
  const startIndex = prev ? 1 : 0;

  const [openId, setOpenId] = useState<string | null>(null);
  const [imageBox, setImageBox] = useState<{ w: number; h: number } | null>(
    null,
  );
  const openImgRef = useRef<HTMLImageElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Set the moment a swipe has decided where it is going, and cleared once the
  // work it went to has arrived. Without it the scroll that carries the old
  // slides off screen reads as another swipe and pushes a second navigation.
  const navigating = useRef(false);

  // Land on the current work. Only three works are rendered, so this is a short
  // distance — but it must not be an animated one: assigning scrollLeft honours
  // `scroll-behavior: smooth`, and arriving from a swipe that would animate back
  // across the slide just left. Instant here, smooth left in place for the arrows.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const behavior = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = startIndex * el.clientWidth;
    el.style.scrollBehavior = behavior;

    navigating.current = false;
    setOpenId(null);
    setImageBox(null);
  }, [current.id, startIndex]);

  // Swiping to a neighbour is a navigation, because the neighbour is the last
  // slide there is: the URL becomes that work and the server sends a fresh window
  // around it. That is what lets a swipe still cross the whole gallery while the
  // page stays three images wide.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const order = [prev, current, next].filter((w): w is Artwork => w !== null);
    let timer: ReturnType<typeof setTimeout>;

    const settle = () => {
      if (navigating.current || !el.clientWidth) return;
      const target = order[Math.round(el.scrollLeft / el.clientWidth)];
      if (!target || target.id === current.id) return;

      navigating.current = true;
      router.push(`/works/${medium}/${target.base}`, { scroll: false });
    };

    // Scroll end rather than scroll: a swipe fires dozens of these on the way,
    // and only where it stops is a work.
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [prev, current, next, medium, router]);

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
        {/* Links rather than scroll buttons now that a neighbour is a URL: the
            arrows middle-click and right-click like anything else, and they lead
            to the same place a swipe does. */}
        {prev && (
          <Link
            href={`/works/${medium}/${prev.base}`}
            className={`${styles.navArrow} ${styles.navArrowLeft}`}
            aria-label={labels.prev}
            scroll={false}
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
                  alt={a.title[locale]}
                  // All three eagerly: the neighbours are here to be swiped to,
                  // and one of them decoded in advance is the whole point of
                  // rendering them at all.
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
            scroll={false}
          >
            ›
          </Link>
        )}
      </div>
    </>
  );
}
