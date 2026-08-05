// Auth gate for the /admin API routes. The /admin surface is protected at the
// Cloudflare edge by an Access application; here we additionally verify the
// `Cf-Access-Jwt-Assertion` JWT (defense-in-depth, so hitting the Worker URL
// directly — bypassing Access — is rejected).
//
// Configured via env (see wrangler.jsonc / Access app):
//   CF_ACCESS_TEAM_DOMAIN  e.g. "myteam.cloudflareaccess.com"
//   CF_ACCESS_AUD          the Access application's Audience (AUD) tag
//
// When CF_ACCESS_AUD is empty: allowed in development (local dev bypass),
// rejected in production (fail closed until Access is configured).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteJWKSet, jwtVerify } from "jose";

const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

// Cache one JWKS fetcher per team domain (module scope survives across requests).
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
    );
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

// CSRF defense: Access auth rides on a cookie, so the browser would attach it
// to cross-site requests too. Require state-changing requests to be same-origin.
// (multipart uploads are "simple" requests with no CORS preflight, so this is
// the guard that stops a malicious page from POSTing as the logged-in artist.)
function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  // Fallback for clients without Fetch Metadata: compare Origin to Host.
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export type AuthResult = { ok: true } | { ok: false; reason: string };

export async function checkAuth(req: Request): Promise<AuthResult> {
  // Block cross-site state-changing requests (CSRF).
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !isSameOrigin(req))
    return { ok: false, reason: "cross-site request blocked" };

  const { env } = await getCloudflareContext({ async: true });
  const aud = (env.CF_ACCESS_AUD as string) || "";
  const teamDomain = (env.CF_ACCESS_TEAM_DOMAIN as string) || "";

  if (!aud || !teamDomain) {
    // Access not configured yet: allow locally, fail closed in production.
    if (process.env.NODE_ENV !== "production") return { ok: true };
    const missingSecrets = [
      !teamDomain && "CF_ACCESS_TEAM_DOMAIN",
      !aud && "CF_ACCESS_AUD",
    ].filter(Boolean);
    return {
      ok: false,
      reason: `admin auth is not configured on the Worker — missing secret(s): ${missingSecrets.join(", ")}. Set them with \`wrangler secret put\`.`,
    };
  }

  const token = req.headers.get(ACCESS_JWT_HEADER);
  if (!token)
    return {
      ok: false,
      reason: "this request did not come through Cloudflare Access",
    };

  try {
    await jwtVerify(token, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: `Access token rejected (${e instanceof Error ? e.message : String(e)})`,
    };
  }
}

/** 401 JSON response for unauthorized admin requests. */
export function unauthorized(reason = "unauthorized"): Response {
  // eslint-disable-next-line no-console
  console.warn(`admin auth rejected: ${reason}`);
  return Response.json({ error: reason }, { status: 401 });
}
