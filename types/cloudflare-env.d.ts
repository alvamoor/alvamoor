// Worker secrets, declared by hand because `wrangler types` cannot see them.
//
// cloudflare-env.d.ts is generated from wrangler.jsonc, and these two are set
// with `wrangler secret put` rather than declared there — deliberately, since
// they are secrets. So every `pnpm cf-typegen` drops them, and app/lib/admin-auth
// stops compiling. They used to survive only because the committed generated file
// predated their move out of config (it typed them `""`, the literal type wrangler
// emits for an empty var).
//
// Interface merging puts them back. This file is hand-written and never
// regenerated, so the declarations hold.
//
// Optional on purpose: in production both are required and admin auth fails
// closed without them, but locally they are genuinely absent — see
// app/lib/admin-auth.ts.
interface CloudflareEnv {
  /** Cloudflare Access team domain, e.g. "myteam.cloudflareaccess.com". */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's Audience (AUD) tag. */
  CF_ACCESS_AUD?: string;
}
