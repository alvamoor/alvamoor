"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { type Artwork } from "@/app/lib/artworks";
import { TILE_COLORS } from "@/app/lib/palette";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import styles from "../gallery.module.css";

type Labels = {
  sold: string;
  available: string;
  prev: string;
  next: string;
};

type Props = {
  works: Artwork[];
  locale: Locale;
  labels: Labels;
  medium: string;
  open: number | null;
};

export default function MediumGallery({
  works,
  locale,
  labels,
  medium,
  open,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const mode = open === null ? "grid" : "scroller";
  const startIndex = open ?? 0;

  // Roughly the above-the-fold grid rows (3 cols mobile, 4 desktop). These load
  // eagerly at high priority for a fast LCP; everything below stays lazy.
  const EAGER_COUNT = 8;

  const [openId, setOpenId] = useState<string | null>(null);
  // The work currently centred in the scroller — drives which images stay
  // loaded (this one plus its left/right neighbours) so arrowing never blanks.
  const [current, setCurrent] = useState(startIndex);
  const [imageBox, setImageBox] = useState<{ w: number; h: number } | null>(
    null,
  );
  const openImgRef = useRef<HTMLImageElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function openScroller(index: number) {
    router.push(`${pathname}?w=${index}`, { scroll: false });
  }

  function scrollByDir(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  function toggle(id: string) {
    setImageBox(null);
    setOpenId((cur) => (cur === id ? null : id));
  }

  useEffect(() => {
    setOpenId(null);
    setImageBox(null);
  }, [open]);

  // Position the scroller on the clicked work when entering it.
  useLayoutEffect(() => {
    if (mode !== "scroller") return;
    const el = scrollerRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
    setCurrent(startIndex);
  }, [mode, startIndex]);

  // Track the centred work as the scroller moves so neighbours stay preloaded.
  useEffect(() => {
    if (mode !== "scroller") return;
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.clientWidth)
        setCurrent(Math.round(el.scrollLeft / el.clientWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [mode]);

  // Esc closes an open caption, else returns to the grid.
  useEffect(() => {
    if (mode !== "scroller") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openId) setOpenId(null);
      else router.push(pathname, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, openId, router, pathname]);

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

  if (mode === "grid") {
    return (
      <div className={styles.grid}>
        {works.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={styles.thumb}
            onClick={() => openScroller(i)}
            aria-label={a.title[locale]}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.thumbImg}
              src={a.src}
              srcSet={a.webpSrcSet}
              sizes="(min-width: 768px) 190px, 33vw"
              alt={a.title[locale]}
              loading={i < EAGER_COUNT ? "eager" : "lazy"}
              fetchPriority={i < EAGER_COUNT ? "high" : "auto"}
              decoding="async"
              style={{ backgroundColor: TILE_COLORS[i % TILE_COLORS.length] }}
            />
          </button>
        ))}
      </div>
    );
  }

  const many = works.length > 1;

  return (
    <div className={styles.scrollerWrap}>
      {many && (
        <button
          type="button"
          className={`${styles.navArrow} ${styles.navArrowLeft}`}
          onClick={() => scrollByDir(-1)}
          aria-label={labels.prev}
        >
          ‹
        </button>
      )}

      <div className={styles.works} data-medium={medium} ref={scrollerRef}>
        {works.map((a, i) => (
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
                loading={Math.abs(i - current) <= 1 ? "eager" : "lazy"}
                fetchPriority={i === current ? "high" : "auto"}
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
                  <span className={styles.captionTitle}>{a.title[locale]}</span>
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

      {many && (
        <button
          type="button"
          className={`${styles.navArrow} ${styles.navArrowRight}`}
          onClick={() => scrollByDir(1)}
          aria-label={labels.next}
        >
          ›
        </button>
      )}
    </div>
  );
}
