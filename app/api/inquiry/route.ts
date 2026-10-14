// Public: a visitor asks about a work, the artist gets an email. Everything the
// email says about the work comes from the manifest, never from the request, so
// the body cannot be used to send arbitrary text under the site's name.
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { readManifest } from "@/app/lib/admin-r2";
import { isMedium } from "@/app/lib/artworks";
import {
  INBOX,
  MAX_NOTE,
  SENDER,
  inquiryEmail,
  isEmail,
} from "@/app/lib/inquiry";
import { isSameOrigin } from "@/app/lib/same-origin";
import { isLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

// A valid request is a few hundred bytes plus a note of at most MAX_NOTE
// characters (up to 4 bytes each in UTF-8), so this leaves generous headroom.
const MAX_BODY_BYTES = 12 * 1024;

const TURNSTILE_VERIFY =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function passesTurnstile(
  secret: string,
  token: unknown,
  ip: string | null,
): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY, { method: "POST", body: form });
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isSameOrigin(req))
    return Response.json(
      { error: "cross-site request blocked" },
      { status: 403 },
    );

  // Refuse an oversized body before reading it. Content-Length can be absent
  // (chunked), so the text is measured again once read.
  const declared = Number(req.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES)
    return Response.json({ error: "too large" }, { status: 413 });
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES)
    return Response.json({ error: "too large" }, { status: 413 });

  const body = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })() as {
    medium?: unknown;
    base?: unknown;
    locale?: unknown;
    email?: unknown;
    note?: unknown;
    website?: unknown;
    turnstile?: unknown;
  } | null;

  if (!body) return Response.json({ error: "invalid" }, { status: 400 });

  // A honeypot: invisible to people, filled in by bots. Answer as if it worked so
  // the bot learns nothing.
  if (typeof body.website === "string" && body.website !== "")
    return Response.json({ ok: true });

  const { medium, base, locale, email } = body;
  const note = typeof body.note === "string" ? body.note : "";
  if (
    !isMedium(medium as string) ||
    typeof base !== "string" ||
    !isLocale(locale as string) ||
    !isEmail(email) ||
    note.length > MAX_NOTE
  )
    return Response.json({ error: "invalid" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });

  // Enforced as soon as the secret exists, so enabling Turnstile is one
  // `wrangler secret put` and nothing else. Until then the honeypot and the
  // fixed recipient are all there is.
  const secret = env.TURNSTILE_SECRET;
  if (secret) {
    const ok = await passesTurnstile(
      secret,
      body.turnstile,
      req.headers.get("cf-connecting-ip"),
    );
    if (!ok)
      return Response.json({ error: "verification failed" }, { status: 403 });
  }

  const m = medium as Parameters<typeof readManifest>[1];
  const entries = await readManifest(env.IMAGES_BUCKET, m);
  const work = entries.find((e) => e.base === base);
  if (!work) return Response.json({ error: "unknown work" }, { status: 404 });
  if (work.status === "sold")
    return Response.json({ error: "sold" }, { status: 409 });

  const { subject, text } = inquiryEmail({
    work,
    medium: m,
    locale: locale as "en" | "de",
    visitorEmail: email,
    note,
  });

  try {
    await env.EMAIL.send({
      from: { email: SENDER, name: "alvamoor.com" },
      to: INBOX,
      replyTo: email,
      subject,
      text,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `inquiry email failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return Response.json({ error: "send failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
