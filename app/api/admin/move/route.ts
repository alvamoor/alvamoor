// Admin move: takes works out of one medium and puts them in another. Behind
// Cloudflare Access + JWT verification.
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { checkAuth, unauthorized } from "@/app/lib/admin-auth";
import {
  MAX_PER_MOVE,
  copyWorkImages,
  deleteWorkImages,
  planMove,
  readManifest,
  writeManifest,
} from "@/app/lib/admin-r2";
import { isMedium } from "@/app/lib/artworks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return unauthorized(auth.reason);

  const body = (await req.json().catch(() => null)) as {
    from?: string;
    to?: string;
    bases?: unknown;
  } | null;

  if (!body || !isMedium(body.from) || !isMedium(body.to))
    return Response.json({ error: "invalid medium" }, { status: 400 });
  if (body.from === body.to)
    return Response.json(
      { error: "source and destination are the same" },
      { status: 400 },
    );
  if (
    !Array.isArray(body.bases) ||
    body.bases.length === 0 ||
    !body.bases.every((b) => typeof b === "string")
  )
    return Response.json({ error: "bases must be a list" }, { status: 400 });
  if (body.bases.length > MAX_PER_MOVE)
    return Response.json(
      { error: `move at most ${MAX_PER_MOVE} works at a time` },
      { status: 400 },
    );

  const { from, to } = body;
  const bases = body.bases as string[];
  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.IMAGES_BUCKET;

  const [source, destination] = await Promise.all([
    readManifest(bucket, from),
    readManifest(bucket, to),
  ]);

  const { moving, already, unknown } = planMove(source, destination, bases);
  if (unknown.length > 0)
    return Response.json(
      { error: `not in ${from}: ${unknown.join(", ")}` },
      { status: 409 },
    );

  // Images first, one work at a time. A work whose images cannot all be copied is
  // left exactly where it was and reported; the rest still move.
  const copied: typeof moving = [];
  const failed: { base: string; reason: string }[] = [];
  for (const entry of moving) {
    try {
      await copyWorkImages(bucket, from, to, entry.base);
      copied.push(entry);
    } catch (e) {
      failed.push({
        base: entry.base,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const leaving = new Set([...copied.map((e) => e.base), ...already]);
  if (leaving.size === 0)
    return Response.json(
      { error: "nothing could be moved", failed },
      { status: 502 },
    );

  // Destination manifest before source. If the second write fails, the work is
  // briefly in both galleries — both with working images — rather than in neither.
  // Moved works go to the front, as new works do, and keep their addedAt.
  if (copied.length > 0)
    await writeManifest(bucket, to, [...copied, ...destination]);
  await writeManifest(
    bucket,
    from,
    source.filter((e) => !leaving.has(e.base)),
  );

  // Only now that nothing references them, remove the originals. Best-effort for
  // the same reason as in the save route: the move has already succeeded.
  const results = await Promise.allSettled(
    [...leaving].map((base) => deleteWorkImages(bucket, from, base)),
  );
  const orphaned = results.filter((r) => r.status === "rejected").length;
  if (orphaned > 0)
    // eslint-disable-next-line no-console
    console.warn(
      `moved ${leaving.size} works ${from} → ${to}, but ${orphaned} image deletions failed — those objects are now unreferenced in R2`,
    );

  return Response.json({
    ok: true,
    moved: leaving.size,
    failed,
    orphaned,
  });
}
