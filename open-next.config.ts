// With no incrementalCache configured, OpenNext defaults to "dummy" — an
// override whose get/set/delete each throw '"Dummy" cache does not cache
// anything'. Nothing was cached, which made `revalidate: 60` in
// app/lib/artworks.ts a no-op: every render fetched <medium>/index.json over the
// network. On this zone (Free plan, so no Tiered Cache) that is one R2 round trip
// per Cloudflare colo per render.
//
// KV is the store; the binding is NEXT_INC_CACHE_KV in wrangler.jsonc, which is
// the name the override looks up rather than a name we chose.
//
// withRegionalCache adds a colo-local layer in front using the Cache API.
// "long-lived" keeps a fetch entry until it is revalidated, so repeat renders in
// the same colo do not even reach KV.
//
// Note this alone does not make pages cacheable: every route still renders
// dynamically, because app/layout.tsx reads a header via getLocale(). What it
// does fix is the data cache behind that render. See
// docs/code-audit-2026-08-10.md.
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, {
    mode: "long-lived",
  }),
});
