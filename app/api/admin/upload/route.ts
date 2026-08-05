// Admin image upload. Receives the browser-resized webp variants for one work
// and stores them in R2 under <medium>/<base>-<width>.webp. Behind Cloudflare
// Access + JWT verification.
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { checkAuth, unauthorized } from "@/app/lib/admin-auth";
import { WIDTHS, isMedium } from "@/app/lib/artworks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) return unauthorized(auth.reason);

  const form = await req.formData();
  const medium = form.get("medium");
  const base = form.get("base");

  if (typeof medium !== "string" || !isMedium(medium))
    return Response.json({ error: "invalid medium" }, { status: 400 });
  if (typeof base !== "string" || !/^[a-zA-Z0-9_-]+$/.test(base))
    return Response.json({ error: "invalid base" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });

  let stored = 0;
  for (const w of WIDTHS) {
    const file = form.get(`file-${w}`);
    if (!(file instanceof File)) continue;
    await env.IMAGES_BUCKET.put(
      `${medium}/${base}-${w}.webp`,
      await file.arrayBuffer(),
      {
        httpMetadata: {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        },
      },
    );
    stored++;
  }

  return Response.json({ ok: true, base, stored });
}
