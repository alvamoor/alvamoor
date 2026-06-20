// Artwork data. Works on paper (IMG_*) and on canvas (canvas-*), images served
// from Cloudflare R2 under <medium>/<base>-<width>.webp. Titles / dimensions /
// years / status are placeholders to be replaced with real values.

export type Medium = "paper" | "canvas";

type LocalizedText = { en: string; de: string };

export type Artwork = {
  id: string;
  title: LocalizedText;
  /** Optional free-text description shown in the dialog. */
  description?: LocalizedText;
  medium: Medium;
  /** Human-readable medium line, e.g. "Oil on canvas". */
  mediumLabel: LocalizedText;
  year: number;
  /** Real-world size in centimetres. */
  widthCm: number;
  heightCm: number;
  status: "available" | "sold";
  /** Fallback image URL (for browsers ignoring srcSet). */
  src: string;
  /** Responsive `srcSet` across the widths uploaded to R2. */
  webpSrcSet: string;
};

const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "https://img.alvamoor.com";

const WIDTHS = [640, 1024, 1200];
const FALLBACK_WIDTH = 1024;

function srcFor(medium: Medium, base: string) {
  const url = (w: number) => `${IMAGE_BASE}/${medium}/${base}-${w}.webp`;
  return {
    src: url(FALLBACK_WIDTH),
    webpSrcSet: WIDTHS.map((w) => `${url(w)} ${w}w`).join(", "),
  };
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
    id: "canvas-02",
    base: "canvas-02",
    title: untitled("XI"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 90,
    heightCm: 110,
    status: "available",
  },
  {
    id: "canvas-03",
    base: "canvas-03",
    title: untitled("XII"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 150,
    heightCm: 80,
    status: "available",
  },
  {
    id: "canvas-04",
    base: "canvas-04",
    title: untitled("XIII"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 90,
    heightCm: 140,
    status: "available",
  },
  {
    id: "canvas-05",
    base: "canvas-05",
    title: untitled("XIV"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 120,
    heightCm: 100,
    status: "available",
  },
  {
    id: "canvas-06",
    base: "canvas-06",
    title: untitled("XV"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 100,
    heightCm: 110,
    status: "available",
  },
  {
    id: "canvas-07",
    base: "canvas-07",
    title: untitled("XVI"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 100,
    heightCm: 120,
    status: "available",
  },
  {
    id: "canvas-08",
    base: "canvas-08",
    title: untitled("XVII"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 95,
    heightCm: 120,
    status: "available",
  },
  {
    id: "canvas-09",
    base: "canvas-09",
    title: untitled("XVIII"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2024,
    widthCm: 110,
    heightCm: 110,
    status: "available",
  },
  {
    id: "canvas-10",
    base: "canvas-10",
    title: untitled("XIX"),
    medium: "canvas",
    mediumLabel: OIL,
    year: 2025,
    widthCm: 90,
    heightCm: 140,
    status: "available",
  },
  // ── Paper ──────────────────────────────────────────────
  {
    id: "IMG_3190",
    base: "IMG_3190",
    title: untitled("I"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 150,
    heightCm: 110,
    status: "available",
  },
  {
    id: "IMG_3191",
    base: "IMG_3191",
    title: untitled("II"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 100,
    heightCm: 140,
    status: "available",
  },
  {
    id: "IMG_3192",
    base: "IMG_3192",
    title: untitled("III"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 160,
    heightCm: 120,
    status: "sold",
  },
  {
    id: "IMG_3193",
    base: "IMG_3193",
    title: untitled("IV"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 120,
    heightCm: 90,
    status: "available",
  },
  {
    id: "IMG_3194",
    base: "IMG_3194",
    title: untitled("V"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2023,
    widthCm: 130,
    heightCm: 130,
    status: "available",
  },
  {
    id: "IMG_3195",
    base: "IMG_3195",
    title: untitled("VI"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 110,
    heightCm: 150,
    status: "available",
  },
  {
    id: "IMG_3196",
    base: "IMG_3196",
    title: untitled("VII"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 90,
    heightCm: 120,
    status: "sold",
  },
  {
    id: "IMG_3197",
    base: "IMG_3197",
    title: untitled("VIII"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2023,
    widthCm: 140,
    heightCm: 100,
    status: "available",
  },
  {
    id: "IMG_3198",
    base: "IMG_3198",
    title: untitled("IX"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2024,
    widthCm: 120,
    heightCm: 160,
    status: "available",
  },
  {
    id: "IMG_3715",
    base: "IMG_3715",
    title: untitled("X"),
    medium: "paper",
    mediumLabel: PAPER_MEDIUM,
    year: 2025,
    widthCm: 100,
    heightCm: 130,
    status: "available",
  },
];

const ARTWORKS: Artwork[] = SEEDS.map(({ base, ...rest }) => ({
  ...rest,
  ...srcFor(rest.medium, base),
}));

export function getByMedium(medium: Medium): Artwork[] {
  return ARTWORKS.filter((a) => a.medium === medium);
}

export function isMedium(value: string | undefined): value is Medium {
  return value === "paper" || value === "canvas";
}
