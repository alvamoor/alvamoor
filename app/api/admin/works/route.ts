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

  // Delete images of works that were removed in this save.
  const prev = await readManifest(env.IMAGES_BUCKET, medium);
  const kept = new Set(entries.map((e) => e.base));
  const removed = prev.filter((e) => !kept.has(e.base));
  await Promise.all(
    removed.map((e) => deleteWorkImages(env.IMAGES_BUCKET, medium, e.base)),
  );

  await writeManifest(env.IMAGES_BUCKET, medium, entries);
  return Response.json({
    ok: true,
    count: entries.length,
    removed: removed.length,
  });
}
