"use client";

import { useState } from "react";

import styles from "./landing.module.css";

export function NameReveal({ name, about }: { name: string; about: string }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <div className={styles.reveal}>
      <h1 className={styles.name}>
        <span className={styles.nameInner}>{name}</span>
      </h1>
      <span className={styles.line} aria-hidden="true" />
      <button
        type="button"
        className={`${styles.about} ${expanded ? styles.aboutExpanded : ""}`}
        aria-expanded={expanded}
        onClick={toggle}
      >
        {about}
      </button>
    </div>
  );
}
