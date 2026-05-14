"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import styles from "./ScrollHint.module.css";

const VISITED_KEY = "alvamoor-visited";

export function ScrollHint() {
  const t = useTranslations("Landing");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(VISITED_KEY)) {
        setDismissed(true);
      } else {
        localStorage.setItem(VISITED_KEY, "1");
      }
    } catch {
      // localStorage unavailable — show hint by default
    }
  }, []);

  useEffect(() => {
    const dismiss = () => setDismissed(true);
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", dismiss, opts);
    window.addEventListener("touchstart", dismiss, opts);
    window.addEventListener("keydown", dismiss, opts);
    return () => {
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchstart", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <div
      className={`${styles.hint} ${dismissed ? styles.dismissed : ""}`}
      role="note"
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2 L12 22 M2 12 L22 12 M9 5 L12 2 L15 5 M5 9 L2 12 L5 15 M19 9 L22 12 L19 15 M9 19 L12 22 L15 19" />
      </svg>
      <span className={styles.label}>{t("explore")}</span>
    </div>
  );
}
