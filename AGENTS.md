# AGENTS.md

Notes for working in this repo.

## Adding an artwork

Works are added through the **`/admin`** UI (Cloudflare Access-gated) — there is
no other way. It resizes the image in the browser (`app/admin/resize.ts`),
uploads the webp variants to R2, and writes the manifest, so there is no script
to run and no redeploy. See `docs/r2-image-migration.md` for the full
background.

Both galleries are fed the same way — one JSON manifest per medium, live in R2
at `<medium>/index.json` (`paper` or `canvas`), read by `app/lib/artworks.ts`
with a 60s revalidate window. Array order is display order (front = shown
first); `base` is the R2 object-key stem, with variants at
`<base>-<width>.webp`. Manifest entry shape:

```json
{
  "base": "3f1a2b9c-...",
  "title": { "en": "Untitled", "de": "Ohne Titel" },
  "mediumLabel": { "en": "Pigments on canvas", "de": "Pigmente auf Leinwand" },
  "year": 2026,
  "widthCm": 130,
  "heightCm": 170,
  "status": "available"
}
```

Canvas works are **always "Pigments on canvas"**. `status` is
`available` | `sold`.

### Verify

```bash
curl -s  https://img.alvamoor.com/canvas/index.json          # entry present
curl -sI https://img.alvamoor.com/canvas/<base>-1200.webp     # expect 200, image/webp
```

## `base` is the public URL

A work's `base` is its address: `/{locale}/works/{medium}/{base}`, served by
`app/[locale]/works/[medium]/[work]/page.tsx`. Two consequences:

- **Reordering is safe.** Array order sets display order only. It used to set the
  URL too (`/works/paper/44` was a position), which meant every bulk re-sort
  silently repointed every link after the change.
- **Renaming a `base` breaks that work's links**, and moves its four R2 objects.
  Every base is a UUID as of 2026-08-24 — `scripts/uuidify-bases.mjs` re-keyed the
  43 hand-named ones (`paper-14`, `IMG_3190`, …), with the old→new mapping recorded
  in `content/base-renames.json`, which is the only way back from a UUID to the
  name a bucket object used to have.

The single-work view renders the work plus its two neighbours, never the whole
medium — `getWindow` in `app/lib/artworks.ts`. That is a hard requirement, not a
nicety: rendering all 94 paper works did not fit in the Worker's CPU budget, so the
ISR re-render after a manifest change failed and the page froze on its last
successful render. Keep that view at three works.

## Auditing R2 (orphans and missing images)

`scripts/reap-orphans.mjs` compares each manifest against what is actually in the
bucket, in both directions:

```bash
node scripts/reap-orphans.mjs                    # check both media, delete nothing
node scripts/reap-orphans.mjs canvas             # one medium
node scripts/reap-orphans.mjs canvas --delete    # remove the orphans it found
node scripts/reap-orphans.mjs --min-age-hours=1  # loosen the freshness guard
```

- **ORPHANS** — objects under `<medium>/` that no manifest entry names. Wasted
  storage, otherwise invisible. These come from an `/admin` **Add** whose Save
  never happened (the upload is immediate, the manifest write is not), or an
  interrupted bulk upload. Safe to delete.
- **MISSING** — a manifest entry names `<base>-<width>.webp` and the object is
  not there. This is a **broken image on the live site**, and the script cannot
  fix it: re-add the work through `/admin` (delete the broken entry first, then
  Add). Exits non-zero so it is hard to miss.

It **deletes nothing without `--delete`**, and skips orphans newer than 24h on
purpose — between clicking Add and clicking Save, a work's images are legitimately
unreferenced, and deleting them would throw away work in progress. Lower the bar
with `--min-age-hours=` only when you know no session is open.

It refuses to run at all if a manifest cannot be read or parsed: with no manifest
every object looks orphaned, and `--delete` would empty the folder. For the same
reason it reads `index.json` straight from R2 rather than through
`img.alvamoor.com`, whose 60s cache could predate the newest upload.

Listing goes through the Cloudflare REST API because `wrangler` has **no
list-objects command**; deletes go through `wrangler r2 object delete`. Auth
reuses your `wrangler login` session, refreshing the token itself when the
short-lived OAuth one has expired. Set `CLOUDFLARE_API_TOKEN` (Account → R2 →
Read) to skip that.

## Other notes

- Mobile layout is only verified on the **deployed** site (after pushing to
  `main`), not locally.
- Common commands: `npm run dev`, `npm run typecheck`, `npm run lint`,
  `npm run deploy` (opennextjs-cloudflare).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
