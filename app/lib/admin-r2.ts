// R2 helpers shared by the /admin API routes. The IMAGES binding is configured
// in wrangler.jsonc and reached via getCloudflareContext().env.
import {
  type ManifestEntry,
  type Medium,
  WIDTHS,
  validateEntry,
} from "@/app/lib/artworks";

// Each moved work is four reads, four writes and four deletes. Capped so one request
// stays well inside the Worker's per-request limits.
export const MAX_PER_MOVE = 20;

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
 * Copy every width variant of a work into another medium's folder. Throws if any
 * variant is missing at the source, after removing whatever it had already copied,
 * so a failed copy leaves nothing behind.
 */
export async function copyWorkImages(
  bucket: R2Bucket,
  from: Medium,
  to: Medium,
  base: string,
): Promise<void> {
  const copied: string[] = [];
  try {
    for (const w of WIDTHS) {
      const src = await bucket.get(imageKey(from, base, w));
      if (!src) throw new Error(`${imageKey(from, base, w)} is missing`);
      const key = imageKey(to, base, w);
      await bucket.put(key, src.body, {
        httpMetadata: src.httpMetadata,
        customMetadata: src.customMetadata,
      });
      copied.push(key);
    }
  } catch (e) {
    await Promise.allSettled(copied.map((k) => bucket.delete(k)));
    throw e;
  }
}

/**
 * Sorts the bases a move was asked for into the three things that can happen to them.
 *
 * `already` are in the destination as well as the source — the leftover of a move
 * whose source write failed. They are not added a second time, but are still removed
 * from the source, which is what lets a retry finish the job instead of being stuck.
 */
export function planMove(
  source: ManifestEntry[],
  destination: ManifestEntry[],
  bases: string[],
): { moving: ManifestEntry[]; already: string[]; unknown: string[] } {
  const asked = new Set(bases);
  const inDestination = new Set(destination.map((e) => e.base));
  const inSource = new Set(source.map((e) => e.base));

  // Source order, not request order, so the moved works keep their relative order.
  const inOrder = source.filter((e) => asked.has(e.base));
  return {
    moving: inOrder.filter((e) => !inDestination.has(e.base)),
    already: inOrder
      .filter((e) => inDestination.has(e.base))
      .map((e) => e.base),
    unknown: bases.filter((b) => !inSource.has(b)),
  };
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
