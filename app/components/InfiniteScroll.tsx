"use client";

import { useEffect, useRef } from "react";

import styles from "./TileField.module.css";

// CYCLE must match the colour period of TileField's tile pattern (3×3).
// CENTER must be a multiple of CYCLE so the centred view is identical to the
// first paint (scroll 0) — the seam offset lives in the spacer's CSS transform,
const CYCLE = 3;
const CENTER = 3;
const EDGE_LOW = 1;
const EDGE_HIGH = 7;

export function InfiniteScroll({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const center = () => {
      el.scrollTo({
        left: CENTER * el.clientWidth,
        top: CENTER * el.clientHeight,
        behavior: "instant",
      });
    };

    let frame = 0;
    const wrap = () => {
      frame = 0;
      const tileWidth = el.clientWidth;
      const tileHeight = el.clientHeight;
      let scrollX = el.scrollLeft;
      let scrollY = el.scrollTop;
      let changed = false;

      if (scrollX < EDGE_LOW * tileWidth) {
        scrollX += CYCLE * tileWidth;
        changed = true;
      } else if (scrollX > EDGE_HIGH * tileWidth) {
        scrollX -= CYCLE * tileWidth;
        changed = true;
      }
      if (scrollY < EDGE_LOW * tileHeight) {
        scrollY += CYCLE * tileHeight;
        changed = true;
      } else if (scrollY > EDGE_HIGH * tileHeight) {
        scrollY -= CYCLE * tileHeight;
        changed = true;
      }

      if (changed) {
        el.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(wrap);
    };

    const isMobileViewport =
      window.matchMedia("(max-width: 48rem)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (!isMobileViewport) {
        center();
        return;
      }

      const nextWidth = window.innerWidth;
      if (Math.abs(nextWidth - lastWidth) < 2) {
        return;
      }
      lastWidth = nextWidth;
      center();
    };

    center();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={scrollerRef} className={styles.fieldScroller}>
      {children}
    </div>
  );
}
