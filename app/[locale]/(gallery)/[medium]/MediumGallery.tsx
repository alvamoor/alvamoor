"use client";

import { useEffect, useState } from "react";

import { type Artwork, MAX_WIDTH_CM, type Medium } from "@/app/lib/artworks";
import type { Locale } from "@/i18n/routing";

import styles from "../gallery.module.css";

type Labels = {
  sold: string;
  available: string;
  zoom: string;
  close: string;
};

type Props = {
  works: Artwork[];
  medium: Medium;
  locale: Locale;
  labels: Labels;
};

// The works listing. Clicking a work opens it in a small modal window (image
// fit to the window + caption); a ＋ button magnifies it to full detail,
// scrollable inside the same window. No page navigation.
export default function MediumGallery({
  works,
  medium,
  locale,
  labels,
}: Props) {
  const [open, setOpen] = useState<Artwork | null>(null);
  const [magnified, setMagnified] = useState(false);
  const isPaper = medium === "paper";

  function show(a: Artwork) {
    setMagnified(false);
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

  return (
    <>
      <div className={styles.works}>
        {works.map((a) => (
          <button
            key={a.id}
            type="button"
            className={styles.work}
            onClick={() => show(a)}
            style={
              { "--ratio": a.widthCm / MAX_WIDTH_CM } as React.CSSProperties
            }
          >
            <span
              className={`${styles.frame} ${isPaper ? styles.framePaper : ""}`}
            >
              {/* White placeholder — keeps the work's real proportions. */}
              <span
                className={styles.image}
                style={{ aspectRatio: `${a.widthCm} / ${a.heightCm}` }}
                role="img"
                aria-label={a.title[locale]}
              />
            </span>
            <span className={styles.meta}>
              <span className={styles.metaTitle}>{a.title[locale]}</span>
              <span className={styles.metaSpec}>
                {a.mediumLabel[locale]} · {a.widthCm} × {a.heightCm} cm ·{" "}
                {a.year}
              </span>
              {a.status === "sold" && (
                <span className={`${styles.metaSpec} ${styles.sold}`}>
                  {labels.sold}
                </span>
              )}
            </span>
          </button>
        ))}
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

            <div
              className={`${styles.modalImageWrap} ${magnified ? styles.modalImageWrapZoom : ""}`}
            >
              <button
                type="button"
                className={styles.modalImageButton}
                onClick={() => setMagnified((m) => !m)}
                aria-label={labels.zoom}
                aria-pressed={magnified}
              >
                {/* White placeholder — keeps the work's real proportions. */}
                <span
                  className={`${styles.modalImage} ${magnified ? styles.modalImageZoom : ""}`}
                  style={
                    {
                      "--ar": open.widthCm / open.heightCm,
                      aspectRatio: `${open.widthCm} / ${open.heightCm}`,
                    } as React.CSSProperties
                  }
                  role="img"
                  aria-label={open.title[locale]}
                />
              </button>
            </div>

            <figcaption className={styles.modalMeta}>
              <span className={styles.modalTitle}>{open.title[locale]}</span>
              <span className={styles.detailSpec}>
                {open.mediumLabel[locale]} · {open.widthCm} × {open.heightCm} cm
                · {open.year}
              </span>
              <span className={styles.detailSpec}>
                {open.status === "sold" ? labels.sold : labels.available}
              </span>
            </figcaption>
          </div>
        </div>
      )}
    </>
  );
}
