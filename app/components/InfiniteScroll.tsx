"use client";

import { useEffect } from "react";

const CYCLE = 3;
const CENTER = 3;
const EDGE_LOW = 1;
const EDGE_HIGH = 7;

export function InfiniteScroll() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const center = () => {
      window.scrollTo({
        left: CENTER * window.innerWidth,
        top: CENTER * window.innerHeight,
        behavior: "instant",
      });
    };

    let frame = 0;
    const wrap = () => {
      frame = 0;
      const windowInnerWidth = window.innerWidth;
      const windowInnerHeight = window.innerHeight;
      let { scrollX, scrollY } = window;
      let changed = false;

      if (scrollX < EDGE_LOW * windowInnerWidth) {
        scrollX += CYCLE * windowInnerWidth;
        changed = true;
      } else if (scrollX > EDGE_HIGH * windowInnerWidth) {
        scrollX -= CYCLE * windowInnerWidth;
        changed = true;
      }
      if (scrollY < EDGE_LOW * windowInnerHeight) {
        scrollY += CYCLE * windowInnerHeight;
        changed = true;
      } else if (scrollY > EDGE_HIGH * windowInnerHeight) {
        scrollY -= CYCLE * windowInnerHeight;
        changed = true;
      }

      if (changed) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
