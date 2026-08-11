// The cache OpenNext runs on. Every override here replaces a default of "dummy",
// and each dummy is not a weak cache but the absence of one: its get/set/delete
// throw, and the caller swallows it. So an unconfigured piece fails silently — the
// site works, it just does the expensive thing forever. See
// docs/code-audit-2026-08-10.md.
//
// incrementalCache is the store behind both `revalidate` in app/lib/artworks.ts
// and the prerendered pages themselves. Without it every render fetched
// <medium>/index.json over the network, which on this zone (Free plan, so no
// Tiered Cache) is one R2 round trip per Cloudflare colo per render. KV is the
// store; the binding is NEXT_INC_CACHE_KV in wrangler.jsonc, which is the name the
// override looks up rather than a name we chose.
//
// withRegionalCache puts a colo-local layer in front using the Cache API. In
// "long-lived" mode an entry is held for its own `revalidate` — 60s for our pages
// — so repeat renders in the same colo do not reach KV.
//
// shouldLazilyUpdateOnCacheHit is why this override defaulted to costing one KV
// read per request rather than saving any. Left unset on Next >= 16 it resolves to
// `!bypassTagCacheOnCacheHit`, i.e. true, and then every regional cache *hit* still
// does `waitUntil(store.get(...))` to refresh itself from KV. Reads therefore
// tracked request count, not miss count, and on 2026-08-11 that crossed the Free
// plan's 100k GETs/day: KV returned 429 for the rest of the day. Nothing broke
// visibly, because a failed get is caught and returned as null — a cache miss — so
// the site just quietly went back to rendering and re-fetching R2 every view.
//
// Turning it off gives up refreshing a colo early: an entry now lives for its full
// `revalidate` before that colo consults KV again. For the works routes that is the
// 60s those pages already promise. For the root layout it is 86400, so the footer
// year (app/[locale]/layout.tsx) can lag a colo behind KV by up to a day on top of
// KV's own day — a once-a-year, ~48h worst case, against a quota that was taking
// the whole site down.
//
// queue is what the multiple-root-layout restructure made necessary. Pages used to
// render dynamically no matter what, because app/layout.tsx read a header via
// getLocale(); now that it is gone (see app/[locale]/layout.tsx) they prerender,
// and `export const revalidate = 60` on the works routes is real ISR rather than a
// hint about a fetch. Time-based ISR re-renders through the queue, so with the
// queue left at "dummy" the stale page would be served and the re-render dropped:
// the page would sit frozen until the next deploy, and the "add a work, no
// redeploy" promise those routes document would quietly be false.
//
// The memory queue re-enters the Worker through the WORKER_SELF_REFERENCE service
// binding (wrangler.jsonc) and asks it to re-render the stale path. It is the
// second queue tried here. The durable-object queue is the better of the two —
// global dedupe, retries on an alarm, a SQLite record of what it has already
// done — but it cannot be introduced through this repo's CI. Cloudflare Workers
// Builds uploads a non-production branch as a *version*, and a version upload
// refuses any Worker carrying a Durable Object migration: "migrations must be
// fully applied via a non-versioned deployment" (API error 10211). So every PR that
// adds a DO fails its own build, whatever the code says. The way back to it is to
// apply the migration once from a plain `wrangler deploy` and only then reintroduce
// the binding — worth doing if ISR ever revalidates often enough for duplicate
// re-renders to matter. It does not, yet.
//
// What is given up is exact dedupe: the memory queue remembers in-isolate, so two
// isolates can both re-render the same path. withQueueCache narrows that, checking
// a colo-local Cache API entry before a message goes through — and a duplicate
// re-render is wasted work, not a wrong page.
//
// enableCacheInterception serves an already-cached page from the cache without
// booting NextServer or loading the route's JavaScript at all. It is off by
// default only because it cannot be combined with PPR, which this app does not
// use. It is worth having now for the same reason the queue is: there are finally
// cached pages for it to intercept.
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import withQueueCache from "@opennextjs/cloudflare/overrides/queue/queue-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, {
    mode: "long-lived",
    shouldLazilyUpdateOnCacheHit: false,
  }),
  queue: withQueueCache(memoryQueue),
  enableCacheInterception: true,
});
