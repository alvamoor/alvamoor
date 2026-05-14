"use client";

import { ARTWORK_COLORS } from "./controls";
import { navTarget } from "./nav";
import styles from "./page.module.css";

export default function NavDots() {
  return (
    <div className={styles.dots} role="navigation">
      {ARTWORK_COLORS.map((color, i) => (
        <button
          key={i}
          type="button"
          className={styles.dot}
          style={{ backgroundColor: color }}
          aria-label={`Go to artwork ${i + 1}`}
          onClick={(e) => {
            e.stopPropagation();
            if (document.pointerLockElement) document.exitPointerLock();
            navTarget.current = i;
          }}
        />
      ))}
    </div>
  );
}
