"use client";

import { useEffect, useRef, useState } from "react";

import { type Artwork } from "@/app/lib/artworks";
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
};

export default function MediumGallery({
  works,
  locale,
  labels,
  medium,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const openImgRef = useRef<HTMLImageElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Scroll one slide (one viewport width) left or right.
  function scrollByDir(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  function toggle(id: string) {
    setBox(null);
    setOpenId((cur) => (cur === id ? null : id));
  }

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const measure = () => {
      const el = openImgRef.current;
      if (el) setBox({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [openId]);

  const many = works.length > 1;

  return (
    <>
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
                {/* Shown whole and as large as the slide allows. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- images are pre-sized WebP variants served straight from R2; no Next optimizer. */}
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
                {openId === a.id && box && (
                  <span
                    className={styles.caption}
                    style={{
                      width: box.w,
                      maxHeight: box.h,
                      top: `calc(50% + ${box.h / 2}px)`,
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
    </>
  );
}
