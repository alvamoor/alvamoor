// Artwork data is stored as JSON manifests in Cloudflare R2, one per medium:
//   <IMAGE_BASE>/paper/index.json, <IMAGE_BASE>/canvas/index.json
// Each manifest is an array of ManifestEntry. Images live alongside in the same
// folder as <base>-<width>.webp. Adding a work = upload its image variants +
// add a manifest entry + run scripts/sync-manifest.mjs — no code change.
// See docs/r2-image-migration.md.

export const MEDIA = ["paper", "canvas"] as const;

export type Medium = (typeof MEDIA)[number];

type LocalizedText = { en: string; de: string };

// One entry in a <medium>/index.json manifest. `medium` is implied by the file.
export type ManifestEntry = {
  /** R2 object-key stem within the medium folder; variants are `<base>-<w>.webp`. */
  base: string;
  title: LocalizedText;
  /** Optional free-text description shown in the dialog. */
  description?: LocalizedText;
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

// Every width here is named in webpSrcSet, so adding one before R2 has it makes
// every work advertise a 404. 384 was backfilled first by scripts/backfill-384.mjs.
export const WIDTHS = [384, 640, 1024, 1200];

const FALLBACK_WIDTH = 384;

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

const isText = (v: unknown): v is LocalizedText =>
  !!v &&
  typeof v === "object" &&
  typeof (v as Record<string, unknown>).en === "string" &&
  typeof (v as Record<string, unknown>).de === "string";

/**
 * Returns an error message if one manifest entry is invalid, else null.
 *
 * Lives here rather than with the admin write path because both ends need it:
 * the admin API rejects a whole save on the first bad entry, while the read path
 * drops bad entries one at a time. The schema is defined in this file, so the
 * check belongs with it — and importing the other direction would be a cycle.
 */
export function validateEntry(e: unknown): string | null {
  const o = e as Record<string, unknown>;
  if (!o || typeof o !== "object") return "not an object";
  if (typeof o.base !== "string" || !/^[a-zA-Z0-9_-]+$/.test(o.base))
    return "invalid base";
  if (!isText(o.title)) return "title must have en+de";
  if (!isText(o.mediumLabel)) return "mediumLabel must have en+de";
  if (o.description !== undefined && !isText(o.description))
    return "description must have en+de";
  if (typeof o.year !== "number") return "year must be a number";
  if (typeof o.widthCm !== "number" || typeof o.heightCm !== "number")
    return "widthCm/heightCm must be numbers";
  if (o.status !== "available" && o.status !== "sold")
    return "status must be available|sold";
  return null;
}

type ManifestRead =
  { ok: true; works: Artwork[] } | { ok: false; reason: string };

async function loadManifest(medium: Medium): Promise<ManifestRead> {
  let res: Response;
  try {
    res = await fetch(`${IMAGE_BASE}/${medium}/index.json`, {
      next: { revalidate: REVALIDATE },
    });
  } catch (cause) {
    return { ok: false, reason: `fetch failed: ${(cause as Error).message}` };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const raw: unknown = await res.json().catch(() => null);
  if (!Array.isArray(raw)) return { ok: false, reason: "not a JSON array" };

  // The manifest is hand-editable and published by three different paths, so it
  // is not trusted here. A malformed entry used to reach the renderer intact and
  // take the page with it — `a.title[locale]` throws on a missing title, and a
  // duplicate base collides as a React key. Dropping the bad entry costs one
  // work; letting it through costs the route.
  const entries: ManifestEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const problem =
      validateEntry(item) ??
      (seen.has((item as ManifestEntry).base) ? "duplicate base" : null);
    if (problem) {
      // eslint-disable-next-line no-console
      console.warn(
        `skipping ${medium} manifest entry: ${problem} — ${JSON.stringify(item).slice(0, 120)}`,
      );
      continue;
    }
    const entry = item as ManifestEntry;
    seen.add(entry.base);
    entries.push(entry);
  }

  return {
    ok: true,
    works: entries.map((entry) => ({
      ...entry,
      id: entry.base,
      medium,
      ...srcFor(medium, entry.base),
    })),
  };
}

export async function getByMedium(medium: Medium): Promise<Artwork[]> {
  const read = await loadManifest(medium);
  if (!read.ok) {
    // eslint-disable-next-line no-console
    console.warn(`${medium} manifest unavailable: ${read.reason}`);
    return [];
  }
  return read.works;
}

export function isMedium(value: string | undefined): value is Medium {
  return MEDIA.some((m) => m === value);
}

export type WorkWindow = {
  prev: Artwork | null;
  current: Artwork;
  next: Artwork | null;
};

export type WorkLookup =
  | { status: "ok"; window: WorkWindow }
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

/**
 * The window around the work named `base`.
 *
 * There is deliberately no lookup by position to go with this. Nothing addresses a
 * work by its index any more, and the one thing that briefly did — a redirect from
 * the old positional URLs — was itself cached, so it could keep pointing at
 * whatever was 44th at the time it was last rendered.
 */
export async function getWindow(
  medium: Medium,
  base: string,
): Promise<WorkLookup> {
  const read = await loadManifest(medium);
  if (!read.ok) return { status: "unavailable", reason: read.reason };

  const works = read.works;
  const i = works.findIndex((w) => w.base === base);
  if (i === -1) return { status: "missing" };

  return {
    status: "ok",
    window: {
      prev: works[i - 1] ?? null,
      current: works[i],
      next: works[i + 1] ?? null,
    },
  };
}
