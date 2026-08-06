// The source palette, sampled from one of the paintings: nine clusters of its
// actual pixels, picked for hue spread rather than area, so the mosaic carries
// the canvas's range instead of its average. Reading as a 3×3 (the order
// app/components/TileField lays them out in) it alternates cool and warm:
//
//   slate blue    golden ochre    olive sage
//   pale sand     rust           grey-green
//   dusty taupe   deep olive     terracotta
//
// Nothing paints these values directly — the whole site sits in a light
// register, so what every route grounds on is TILE_TINTS, derived below.
export const TILE_COLORS = [
  "#6e787f",
  "#b29d80",
  "#85886b",
  "#d3bda0",
  "#a77b6a",
  "#888a84",
  "#8b7d76",
  "#726f63",
  "#957a6d",
];

// What the landing actually paints: the nine tiles mixed most of the way toward
// white, so they keep their hue but land in the same light register as the rest
// of the site. TILE_COLORS stays the source of truth — the two derived sets
// below are the same nine tiles at different distances from white.
//
// The painting's colours are mid-lightness where a pigment palette would be
// deep, so this sits lower than it would for saturated sources: 0.55 puts the
// tints at L* 77–90, the band the site was already built around.
const TINT_WHITE = 0.55;

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function tint(colour: string): string {
  const mixed = channels(colour).map((c) =>
    Math.round(c * (1 - TINT_WHITE) + 0xff * TINT_WHITE),
  );

  return hex(mixed[0], mixed[1], mixed[2]);
}

export const TILE_TINTS = TILE_COLORS.map(tint);
