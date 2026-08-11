"use client";

import styles from "./showroom.module.css";

// Back out of the showroom without reading a request header.
//
// The route this replaces read the NEXT_LOCALE cookie purely to decide whether
// "back" meant /de or /en — and that one read made the whole route dynamic, since
// /showroom sits outside next-intl's routing and has no locale of its own.
//
// It does not need one. You arrive here from a work's page, so back means back.
// The <a href="/"> is what renders and what a crawler follows; the click handler
// upgrades it to history.back() when there is history to return to. The bare "/"
// negotiates locale by Accept-Language, so even a cold shared link lands in the
// right language.
export function BackLink({ label }: { label: string }) {
  return (
    <a
      href="/"
      className={styles.back}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      }}
    >
      <span className={styles.arrow} aria-hidden="true">
        ←
      </span>
      {label}
    </a>
  );
}
