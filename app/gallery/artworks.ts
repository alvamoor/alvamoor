const WIDTHS = [1200] as const;

function srcSetFor(baseName: string, ext: "avif" | "webp") {
  if (ext === "avif") return "";
  return WIDTHS.map(
    (width) => `/artworks/${baseName}-${width}.${ext} ${width}w`,
  ).join(", ");
}

export type ArtworkImage = {
  id: string;
  texture: string;
  fallback: string;
  avifSrcSet: string;
  webpSrcSet: string;
};

const BASE_NAMES = [
  "IMG_3190",
  "IMG_3191",
  "IMG_3192",
  "IMG_3193",
  "IMG_3194",
  "IMG_3195",
  "IMG_3196",
  "IMG_3197",
  "IMG_3198",
] as const;

export const ARTWORK_IMAGES: ArtworkImage[] = BASE_NAMES.map((baseName) => ({
  id: baseName,
  texture: `/artworks/${baseName}-1200.webp`,
  fallback: `/artworks/${baseName}-1200.webp`,
  avifSrcSet: srcSetFor(baseName, "avif"),
  webpSrcSet: srcSetFor(baseName, "webp"),
}));
