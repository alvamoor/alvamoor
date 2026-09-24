// No cache overrides. Every override here would replace a default of "dummy",
// and each dummy is the absence of a cache rather than a weak one: its
// get/set/delete throw, and the caller swallows it. So the site works and simply
// renders on demand, fetching <medium>/index.json from R2 per render.
//
// That is deliberate, and it is a reversal. Between 2026-08-10 and 2026-08-11 this
// file configured a KV incremental cache, a regional cache in front of it, an ISR
// queue reaching back through a WORKER_SELF_REFERENCE service binding, and cache
// interception. All of it is gone. The reasoning, with the numbers:
//
//   - At roughly two visitors a day across ~94 URLs and ~300 Cloudflare colos with
//     a 60s TTL, essentially every genuine request was a cache miss. The hit rate
//     rounded to zero, so the cache amortised nothing.
//   - It cost a KV read per request, because withRegionalCache's
//     shouldLazilyUpdateOnCacheHit defaults to true on Next 16 and refreshes from
//     KV on hits too. On 2026-08-11 that crossed the Free plan's 100k reads/day
//     and KV returned 429 for the rest of the day.
//   - The failure was silent. KVIncrementalCache.get catches and returns null,
//     which is indistinguishable from "not cached", so a broken cache just meant
//     doing the expensive thing forever.
//
// See docs/incident-2026-08-11-kv-quota.md.
//
// What this does NOT fix: Worker invocations. Every page view still boots this
// Worker, because OpenNext does not emit prerendered HTML into .open-next/assets —
// there are no .html files there — so no page view is ever served as a static
// asset. Requests to static assets are free and unlimited; ours are not assets.
// That is the remaining structural cost, and the reason a client loop on three
// unchanging pages could exhaust the 100k requests/day Workers limit on
// 2026-08-12. Fixing it means those pages not routing through a Worker at all.
//
// Note that the works routes still carry `export const revalidate`. With the queue
// and incremental cache both dummy, that no longer buys revalidation: the routes
// sit in the prerender manifest with a blocking fallback, the cache read throws and
// is swallowed, and the page re-renders. Harmless at this traffic, but it states an
// intent the configuration no longer honours.
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({});
