"use client";

import { useEffect, useState } from "react";

import styles from "./landing.module.css";

export function NameReveal({
  name,
  about,
  description,
  more,
  close,
}: {
  name: string;
  about: string;
  description: string;
  more: string;
  close: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.reveal}>
      <h1 className={styles.name}>
        <span className={styles.nameInner}>{name}</span>
      </h1>
      <span className={styles.line} aria-hidden="true" />

      <p className={styles.about}>{about}</p>

      <p className={styles.description}>
        {description}{" "}
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {more}
        </button>
      </p>

      {open && (
        <div
          className={styles.aboutOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={name}
        >
          <button
            type="button"
            className={styles.aboutOverlayBackdrop}
            aria-label={close}
            onClick={() => setOpen(false)}
          />
          <div className={styles.aboutPanel}>
            <button
              type="button"
              className={styles.aboutClose}
              aria-label={close}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <p className={styles.aboutPanelText}>{about}</p>
          </div>
        </div>
      )}
    </div>
  );
}
