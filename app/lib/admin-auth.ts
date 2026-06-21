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

/** True if the request is an authenticated Cloudflare Access request. */
export async function isAuthorized(req: Request): Promise<boolean> {
  // Block cross-site state-changing requests (CSRF).
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !isSameOrigin(req)) return false;

  const { env } = await getCloudflareContext({ async: true });
  const aud = (env.CF_ACCESS_AUD as string) || "";
  const teamDomain = (env.CF_ACCESS_TEAM_DOMAIN as string) || "";

  if (!aud || !teamDomain) {
    // Access not configured yet: allow locally, fail closed in production.
    return process.env.NODE_ENV !== "production";
  }

  const token = req.headers.get(ACCESS_JWT_HEADER);
  if (!token) return false;

  try {
    await jwtVerify(token, jwksFor(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    return true;
  } catch {
    return false;
  }
}

/** 401 JSON response for unauthorized admin requests. */
export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
