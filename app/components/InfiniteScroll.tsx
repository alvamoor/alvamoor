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
      const W = window.innerWidth;
      const H = window.innerHeight;
      let { scrollX: x, scrollY: y } = window;
      let changed = false;

      if (x < EDGE_LOW * W) {
        x += CYCLE * W;
        changed = true;
      } else if (x > EDGE_HIGH * W) {
        x -= CYCLE * W;
        changed = true;
      }
      if (y < EDGE_LOW * H) {
        y += CYCLE * H;
        changed = true;
      } else if (y > EDGE_HIGH * H) {
        y -= CYCLE * H;
        changed = true;
      }

      if (changed) {
        window.scrollTo({ left: x, top: y, behavior: "instant" });
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(wrap);
    };

    center();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", center, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", center);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
