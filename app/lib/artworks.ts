// Placeholder artwork data for the landing-redesign prototype.
// Real titles / dimensions / mediums to be filled in later — the shapes and
// the paper-vs-canvas split are what we're testing here.

export type Medium = "paper" | "canvas";

type LocalizedText = { en: string; de: string };

export type Artwork = {
  id: string;
  title: LocalizedText;
  medium: Medium;
  /** Human-readable medium line, e.g. "Oil on canvas". */
  mediumLabel: LocalizedText;
  year: number;
  /** Real-world size in centimetres — drives the to-scale rendering. */
  widthCm: number;
  heightCm: number;
  status: "available" | "sold";
  /** Capped preview image (the only image we have today). */
  src: string;
  webpSrcSet: string;
};

const PREVIEW_WIDTH = 1200;

function srcFor(baseName: string) {
  const src = `/artworks/${baseName}-${PREVIEW_WIDTH}.webp`;
  return { src, webpSrcSet: `${src} ${PREVIEW_WIDTH}w` };
}

const OIL: LocalizedText = { en: "Oil on canvas", de: "Öl auf Leinwand" };
const PAPER_MEDIUM: LocalizedText = {
  en: "Mixed media on paper",
  de: "Mischtechnik auf Papier",
};

// Roman-numeral "Untitled" placeholders so nothing reads as final copy.
function untitled(n: string): LocalizedText {
  return { en: `Untitled ${n}`, de: `Ohne Titel ${n}` };
}

type Seed = Omit<Artwork, "src" | "webpSrcSet"> & { base: string };

const SEEDS: Seed[] = [
  // ── Canvas ─────────────────────────────────────────────
  {
    id: "c1",
    base: "IMG_3190",
    title: untitled("I"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 130,
    heightCm: 100,
    status: "available",
  },
  {
    id: "c2",
    base: "IMG_3191",
    title: untitled("II"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 90,
    heightCm: 120,
    status: "available",
  },
  {
    id: "c3",
    base: "IMG_3192",
    title: untitled("III"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 150,
    heightCm: 110,
    status: "sold",
  },
  {
    id: "c4",
    base: "IMG_3193",
    title: untitled("IV"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 60,
    heightCm: 80,
    status: "available",
  },
  {
    id: "c5",
    base: "IMG_3194",
    title: untitled("V"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2023,
    widthCm: 100,
    heightCm: 100,
    status: "available",
  },
  // ── Paper ──────────────────────────────────────────────
  {
    id: "p1",
    base: "IMG_3195",
    title: untitled("VI"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 42,
    heightCm: 30,
    status: "available",
  },
  {
    id: "p2",
    base: "IMG_3196",
    title: untitled("VII"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 30,
    heightCm: 40,
    status: "available",
  },
  {
    id: "p3",
    base: "IMG_3197",
    title: untitled("VIII"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 56,
    heightCm: 38,
    status: "sold",
  },
  {
    id: "p4",
    base: "IMG_3198",
    title: untitled("IX"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 40,
    heightCm: 40,
    status: "available",
  },
];

const ARTWORKS: Artwork[] = SEEDS.map(({ base, ...rest }) => ({
  ...rest,
  ...srcFor(base),
}));

/** Largest real width across all works — the reference for to-scale rendering. */
export const MAX_WIDTH_CM = Math.max(...ARTWORKS.map((a) => a.widthCm));

export function getByMedium(medium: Medium): Artwork[] {
  return ARTWORKS.filter((a) => a.medium === medium);
}

export function isMedium(value: string | undefined): value is Medium {
  return value === "paper" || value === "canvas";
}
