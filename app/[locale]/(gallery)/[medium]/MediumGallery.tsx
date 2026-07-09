"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { type Artwork } from "@/app/lib/artworks";
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

  const [openId, setOpenId] = useState<string | null>(null);
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
  }, [mode, startIndex]);

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
              loading="lazy"
              decoding="async"
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
        {works.map((a) => (
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
                loading="lazy"
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
