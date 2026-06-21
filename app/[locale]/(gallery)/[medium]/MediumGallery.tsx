"use client";

import { useEffect, useRef, useState } from "react";

import { type Artwork } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

import styles from "../gallery.module.css";

type Labels = {
  sold: string;
  available: string;
  close: string;
  moreInfo: string;
  prev: string;
  next: string;
};

type Props = {
  works: Artwork[];
  locale: Locale;
  labels: Labels;
};

// The works listing. Tiles show the image only; clicking a work opens it in a
// modal with its title and description. The size/year/availability stay hidden
// behind a "more information" toggle. No page navigation.
export default function MediumGallery({ works, locale, labels }: Props) {
  const [open, setOpen] = useState<Artwork | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Scroll one slide (one viewport width) left or right.
  function scrollByDir(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  function show(a: Artwork) {
    setShowDetails(false);
    setOpen(a);
  }

  function close() {
    setOpen(null);
  }

  // Close the modal on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

        <div className={styles.works} ref={scrollerRef}>
          {works.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.work}
              onClick={() => show(a)}
            >
              <span className={styles.frame}>
                {/* Shown whole and as large as the slide allows. */}
                <img
                  className={styles.image}
                  src={a.src}
                  srcSet={a.webpSrcSet}
                  sizes="100vw"
                  alt={a.title[locale]}
                  loading="lazy"
                  decoding="async"
                />
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

      {open && (
        <div
          className={styles.modalRoot}
          role="dialog"
          aria-modal="true"
          aria-label={open.title[locale]}
        >
          <button
            type="button"
            className={styles.modalBackdrop}
            onClick={close}
            aria-label={labels.close}
          />
          <div className={styles.modal}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={close}
              aria-label={labels.close}
            >
              ×
            </button>

            <div className={styles.modalImageWrap}>
              {/* Box keeps the work's real (cm) proportions; the photo fills it. */}
              <img
                className={styles.modalImage}
                src={open.src}
                srcSet={open.webpSrcSet}
                sizes="1200px"
                style={
                  {
                    "--ar": open.widthCm / open.heightCm,
                    aspectRatio: `${open.widthCm} / ${open.heightCm}`,
                  } as React.CSSProperties
                }
                alt={open.title[locale]}
                decoding="async"
              />
            </div>

            <figcaption className={styles.modalMeta}>
              <span className={styles.modalTitle}>{open.title[locale]}</span>
              {/* Title + description show by default. */}
              {open.description?.[locale] && (
                <span className={styles.detailDescription}>
                  {open.description[locale]}
                </span>
              )}

              {/* Medium / size / year / availability stay behind "more information". */}
              {showDetails ? (
                <span className={styles.detailSpec}>
                  {open.mediumLabel[locale]} · {open.widthCm} × {open.heightCm}{" "}
                  cm · {open.year} ·{" "}
                  {open.status === "sold" ? labels.sold : labels.available}
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.moreInfo}
                  onClick={() => setShowDetails(true)}
                >
                  {labels.moreInfo}
                </button>
              )}
            </figcaption>
          </div>
        </div>
      )}
    </>
  );
}
