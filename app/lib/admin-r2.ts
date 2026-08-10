// R2 helpers shared by the /admin API routes. The IMAGES binding is configured
// in wrangler.jsonc and reached via getCloudflareContext().env.
import {
  type ManifestEntry,
  type Medium,
  WIDTHS,
  validateEntry,
} from "@/app/lib/artworks";

const manifestKey = (medium: Medium) => `${medium}/index.json`;
const imageKey = (medium: Medium, base: string, w: number) =>
  `${medium}/${base}-${w}.webp`;

export async function readManifest(
  bucket: R2Bucket,
  medium: Medium,
): Promise<ManifestEntry[]> {
  const obj = await bucket.get(manifestKey(medium));
  if (!obj) return [];
  try {
    const data = JSON.parse(await obj.text());
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeManifest(
  bucket: R2Bucket,
  medium: Medium,
  entries: ManifestEntry[],
): Promise<void> {
  await bucket.put(manifestKey(medium), JSON.stringify(entries, null, 2), {
    httpMetadata: {
      contentType: "application/json",
      // Short TTL so admin edits propagate quickly (paired with REVALIDATE=60).
      cacheControl: "max-age=60",
    },
  });
}

/** Delete every width variant of a work. */
export async function deleteWorkImages(
  bucket: R2Bucket,
  medium: Medium,
  base: string,
): Promise<void> {
  await Promise.all(
    WIDTHS.map((w) => bucket.delete(imageKey(medium, base, w))),
  );
}

/**
 * Returns an error message if the entries array is invalid, else null.
 *
 * Per-entry checks come from validateEntry in artworks.ts — one schema, one
 * validator. What is added here is what only makes sense across a whole array
 * (uniqueness) and the write path's all-or-nothing stance: a save is rejected
 * whole on the first bad entry, rather than silently dropping works the way the
 * read path does.
 */
export function validateEntries(entries: unknown): string | null {
  if (!Array.isArray(entries)) return "entries must be an array";
  const seen = new Set<string>();
  for (const [i, e] of entries.entries()) {
    const problem = validateEntry(e);
    if (problem) return `entry ${i}: ${problem}`;
    const { base } = e as ManifestEntry;
    if (seen.has(base)) return `entry ${i}: duplicate base "${base}"`;
    seen.add(base);
  }
  return null;
}
