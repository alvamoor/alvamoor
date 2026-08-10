// Admin manifest API. GET returns a medium's works; PUT replaces them (and
// deletes the images of any works removed in the new list). Behind Cloudflare
// Access + JWT verification.
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { checkAuth, unauthorized } from "@/app/lib/admin-auth";
import {
  deleteWorkImages,
  readManifest,
  validateEntries,
  writeManifest,
} from "@/app/lib/admin-r2";
import { type ManifestEntry, isMedium } from "@/app/lib/artworks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return unauthorized(auth.reason);

  const medium = new URL(req.url).searchParams.get("medium") ?? undefined;
  if (!isMedium(medium))
    return Response.json({ error: "invalid medium" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  return Response.json(await readManifest(env.IMAGES_BUCKET, medium));
}

export async function PUT(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return unauthorized(auth.reason);

  const body = (await req.json().catch(() => null)) as {
    medium?: string;
    entries?: ManifestEntry[];
  } | null;

  if (!body || !isMedium(body.medium))
    return Response.json({ error: "invalid medium" }, { status: 400 });

  const err = validateEntries(body.entries);
  if (err) return Response.json({ error: err }, { status: 400 });

  const medium = body.medium;
  const entries = body.entries!;
  const { env } = await getCloudflareContext({ async: true });

  const prev = await readManifest(env.IMAGES_BUCKET, medium);
  const kept = new Set(entries.map((e) => e.base));
  const removed = prev.filter((e) => !kept.has(e.base));

  // The manifest is the transaction, and it goes first. Deleting the images
  // first would mean a failed write leaves the *published* manifest listing
  // works whose bytes are already gone — broken images on the live site until
  // someone saves again. This order cannot do that: once the manifest is
  // written, nothing references the old images, so the worst a failed delete
  // leaves behind is unreferenced objects in R2.
  await writeManifest(env.IMAGES_BUCKET, medium, entries);

  // Cleanup, deliberately best-effort. A rejected delete must not fail the
  // request: the save has already succeeded, and reporting it as an error would
  // send the artist back to Save — where `prev` no longer lists the removed
  // works, so the retry deletes nothing and the orphans become permanent and
  // invisible. Counting them here is what makes them findable instead.
  const results = await Promise.allSettled(
    removed.map((e) => deleteWorkImages(env.IMAGES_BUCKET, medium, e.base)),
  );
  const orphaned = results.filter((r) => r.status === "rejected").length;
  if (orphaned > 0)
    // eslint-disable-next-line no-console
    console.warn(
      `manifest ${medium} saved, but ${orphaned} of ${removed.length} image deletions failed — those objects are now unreferenced in R2`,
    );

  return Response.json({
    ok: true,
    count: entries.length,
    removed: removed.length,
    orphaned,
  });
}
