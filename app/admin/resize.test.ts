import { describe, expect, it } from "vitest";

import { WIDTHS } from "@/app/lib/artworks";

import { planWidths } from "./resize";

describe("planWidths", () => {
  it("emits a variant for every width the gallery's srcSet names", () => {
    // Regression: the previous plan was [640, min(natural, 1200)], so a source
    // narrower than 1200 produced e.g. file-900 — a key the upload route never
    // reads — and the gallery 404'd on -1024 and -1200.
    for (const natural of [320, 640, 900, 1024, 1200, 4032]) {
      expect([...planWidths(natural).keys()]).toEqual(WIDTHS);
    }
  });

  it("caps at the source width and never upscales", () => {
    expect([...planWidths(900).values()]).toEqual([384, 640, 900, 900]);
    expect([...planWidths(500).values()]).toEqual([384, 500, 500, 500]);
  });

  it("renders each slot at its full width when the source is large enough", () => {
    expect([...planWidths(4032).values()]).toEqual(WIDTHS);
  });
});
