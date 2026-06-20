// Artwork data is stored as JSON manifests in Cloudflare R2, one per medium:
//   <IMAGE_BASE>/paper/index.json, <IMAGE_BASE>/canvas/index.json
// Each manifest is an array of ManifestEntry. Images live alongside in the same
// folder as <base>-<width>.webp. Adding a work = upload its image variants +
// add a manifest entry + run scripts/sync-manifest.mjs — no code change.
// See docs/r2-image-migration.md.

export type Medium = "paper" | "canvas";

type LocalizedText = { en: string; de: string };

// One entry in a <medium>/index.json manifest. `medium` is implied by the file.
export type ManifestEntry = {
  /** R2 object-key stem within the medium folder; variants are `<base>-<w>.webp`. */
  base: string;
  title: LocalizedText;
  /** Optional free-text description shown in the dialog. */
  description?: LocalizedText;
  /** Human-readable medium line, e.g. "Oil on canvas". */
  mediumLabel: LocalizedText;
  year: number;
  /** Real-world size in centimetres. */
  widthCm: number;
  heightCm: number;
  status: "available" | "sold";
};

export type Artwork = ManifestEntry & {
  id: string;
  medium: Medium;
  /** Fallback image URL (for browsers ignoring srcSet). */
  src: string;
  /** Responsive `srcSet` across the widths uploaded to R2. */
  webpSrcSet: string;
};

// Images live in Cloudflare R2, served via a public custom domain. Override the
// host with NEXT_PUBLIC_IMAGE_BASE_URL for local testing against a different URL.
const IMAGE_BASE =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "https://img.alvamoor.com";

// Widths present in R2. Keep in sync with WIDTHS in gen-image-variants.mjs and
// the admin upload/resize. Exported for the admin API.
export const WIDTHS = [640, 1024, 1200];
const FALLBACK_WIDTH = 1024;

// How long (seconds) a fetched manifest is cached before re-fetching. New works
// appear within this window without an app redeploy.
const REVALIDATE = 60;

function srcFor(medium: Medium, base: string) {
  const url = (w: number) => `${IMAGE_BASE}/${medium}/${base}-${w}.webp`;
  return {
    src: url(FALLBACK_WIDTH),
    webpSrcSet: WIDTHS.map((w) => `${url(w)} ${w}w`).join(", "),
  };
}

export async function getByMedium(medium: Medium): Promise<Artwork[]> {
  const res = await fetch(`${IMAGE_BASE}/${medium}/index.json`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) return [];

  const entries = (await res.json()) as ManifestEntry[];
  return entries.map((entry) => ({
    ...entry,
    id: entry.base,
    medium,
    ...srcFor(medium, entry.base),
  }));
}

export function isMedium(value: string | undefined): value is Medium {
  return value === "paper" || value === "canvas";
}
