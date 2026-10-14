// CSRF defense: Access auth rides on a cookie, so the browser would attach it
// to cross-site requests too. Require state-changing requests to be same-origin.
// (multipart uploads are "simple" requests with no CORS preflight, so this is
// the guard that stops a malicious page from POSTing as the logged-in artist.)
export function isSameOrigin(req: Request): boolean {
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
