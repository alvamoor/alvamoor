// R2 helpers shared by the /admin API routes. The IMAGES binding is configured
// in wrangler.jsonc and reached via getCloudflareContext().env.
import { type ManifestEntry, type Medium, WIDTHS } from "@/app/lib/artworks";

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

const isText = (v: unknown): v is { en: string; de: string } =>
  !!v &&
  typeof v === "object" &&
  typeof (v as Record<string, unknown>).en === "string" &&
  typeof (v as Record<string, unknown>).de === "string";

/** Returns an error message if the entries array is invalid, else null. */
export function validateEntries(entries: unknown): string | null {
  if (!Array.isArray(entries)) return "entries must be an array";
  const seen = new Set<string>();
  for (const [i, e] of entries.entries()) {
    const o = e as Record<string, unknown>;
    if (typeof o.base !== "string" || !/^[a-zA-Z0-9_-]+$/.test(o.base))
      return `entry ${i}: invalid base`;
    if (seen.has(o.base)) return `entry ${i}: duplicate base "${o.base}"`;
    seen.add(o.base);
    if (!isText(o.title)) return `entry ${i}: title must have en+de`;
    if (!isText(o.mediumLabel))
      return `entry ${i}: mediumLabel must have en+de`;
    if (o.description !== undefined && !isText(o.description))
      return `entry ${i}: description must have en+de`;
    if (typeof o.year !== "number") return `entry ${i}: year must be a number`;
    if (typeof o.widthCm !== "number" || typeof o.heightCm !== "number")
      return `entry ${i}: widthCm/heightCm must be numbers`;
    if (o.status !== "available" && o.status !== "sold")
      return `entry ${i}: status must be available|sold`;
  }
  return null;
}
