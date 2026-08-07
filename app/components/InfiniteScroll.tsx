"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "@/i18n/navigation";

import styles from "./TileField.module.css";

// CYCLE must match the colour period of TileField's tile pattern (3×3).
// CENTER must be a multiple of CYCLE so the centred view is identical to the
// first paint (scroll 0) — the seam offset lives in the spacer's CSS transform,
const CYCLE = 3;
const CENTER = 3;
const EDGE_LOW = 1;
const EDGE_HIGH = 7;

// ── First-move indicator ──────────────────────────────────────────────
const NUDGE_KEY = "alvamoor:field-nudged.2";
const NUDGE_DELAY = 700;
const NUDGE_OUT = 1100;
const NUDGE_HOLD = 300;
const NUDGE_BACK = 1300;
const NUDGE_X = 120;
const NUDGE_Y = 80;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

export function InfiniteScroll({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  useEffect(() => {
    if (pathname !== "/") return;

    const el = scrollerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Once per visitor and per try
    try {
      if (localStorage.getItem(NUDGE_KEY)) return;
    } catch {
      return;
    }

    let cancelled = false;
    let frame = 0;
    let timer = 0;

    const cancel = () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };

    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const opts = { passive: true, once: true } as const;
    for (const event of events) window.addEventListener(event, cancel, opts);

    const run = () => {
      if (cancelled) return;
      const left = el.scrollLeft;
      const top = el.scrollTop;
      const start = performance.now();

      const step = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const back = NUDGE_OUT + NUDGE_HOLD;
        let progress: number;

        if (elapsed < NUDGE_OUT) {
          progress = easeOut(elapsed / NUDGE_OUT);
        } else if (elapsed < back) {
          progress = 1;
        } else if (elapsed < back + NUDGE_BACK) {
          progress = 1 - easeInOut((elapsed - back) / NUDGE_BACK);
        } else {
          el.scrollTo({ left, top, behavior: "instant" });
          localStorage.setItem(NUDGE_KEY, "1");
          return;
        }

        el.scrollTo({
          left: left + NUDGE_X * progress,
          top: top + NUDGE_Y * progress,
          behavior: "instant",
        });
        frame = requestAnimationFrame(step);
      };

      frame = requestAnimationFrame(step);
    };

    // Long enough after first paint that the field is settled and the movement
    // reads as deliberate rather than as the page still loading.
    timer = window.setTimeout(run, NUDGE_DELAY);

    return () => {
      cancel();
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, [pathname]);

  return (
    <div ref={scrollerRef} className={styles.fieldScroller}>
      {children}
    </div>
  );
}
