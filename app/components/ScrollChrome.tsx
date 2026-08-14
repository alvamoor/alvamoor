"use client";

import { useEffect } from "react";

import { usePathname } from "@/i18n/navigation";

// Publishes the three things the sticky chrome needs and CSS cannot work out for
// itself. Renders nothing.
//
//   --header-h   the sticky header's height. The works subnav pins beneath it and
//   --subnav-h   the frosted veil spans both, and each is rows of clamped type —
//                there is no value to hard-code, so both are measured.
//   data-scroll  "top" | "down" | "up" on <html>: the scroll *direction*. No CSS
//                feature exposes it (scroll-driven animations report position),
//                and the subnav rides on it — out of the way while you read
//                downward, back into view as soon as you scroll up.
//
// See shell.module.css (.veil) and works.module.css (.mediumNav) for the rules
// that read them.

// Travel required before believing a direction change, so jitter and momentum
// wobble do not flap the subnav. Small: the frosted band is already showing while
// you are scrolled, so every pixel spent waiting here is the subnav looking late.
const FLIP = 3;

// Within this much of the top the page counts as "at the top": the subnav sits in
// its natural place and the veil is clear. Matches the range over which the frost
// fades in (3rem), so the two agree about when scrolling has begun.
const TOP = 48;

export function ScrollChrome() {
  const pathname = usePathname();

  // Scroll direction. Mount-once: the listener does not care which page it is on.
  useEffect(() => {
    const root = document.documentElement;
    let last = window.scrollY;
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;

      if (y <= TOP) {
        root.dataset.scroll = "top";
        last = y;
        return;
      }

      const delta = y - last;
      // Below the threshold, leave `last` alone so a slow drag still accumulates
      // into a direction instead of being swallowed frame by frame.
      if (Math.abs(delta) < FLIP) return;

      root.dataset.scroll = delta > 0 ? "down" : "up";
      last = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      delete root.dataset.scroll;
    };
  }, []);

  // Chrome heights. Re-runs per route: the header lives in the layout and stays
  // mounted, but the subnav only exists on the works overview, so navigation is
  // what makes it appear and disappear.
  useEffect(() => {
    const root = document.documentElement;
    const parts = [
      { selector: '[data-chrome="header"]', property: "--header-h" },
      { selector: '[data-chrome="subnav"]', property: "--subnav-h" },
    ] as const;

    const observer = new ResizeObserver(() => measure());

    function measure() {
      for (const { selector, property } of parts) {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          root.style.removeProperty(property);
          continue;
        }
        const { height } = element.getBoundingClientRect();
        root.style.setProperty(property, `${Math.round(height)}px`);
      }
    }

    for (const { selector } of parts) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) observer.observe(element);
    }
    measure();

    window.addEventListener("resize", measure, { passive: true });

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
      // The values are deliberately left in place: this cleanup also runs on every
      // route change, and clearing them would drop the subnav's `top` to 0 for a
      // frame — pinning it behind the header. measure() already removes a property
      // when its element is genuinely gone.
    };
  }, [pathname]);

  return null;
}
