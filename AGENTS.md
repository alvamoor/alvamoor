# AGENTS.md

Notes for working in this repo. The most common manual task is **adding an
artwork image**, which is documented in full below.

## Adding an artwork image (manual)

### TL;DR — adding a new work (every step, in order)

A new artwork (e.g. `IMG_4618`) goes into one medium's gallery. Every step:

```bash
# 1. HEIC -> webp variants (isolate the one file; the script reads a whole dir)
tmp=$(mktemp -d) && cp content/canvas/IMG_4618.heic "$tmp"/ \
  && node scripts/gen-image-variants.mjs "$tmp" image-variants && rm -rf "$tmp"
#    -> image-variants/IMG_4618-{640,1024,1200}.webp

# 2. Upload variants to R2 (--remote is REQUIRED; `canvas` or `paper` folder)
for f in image-variants/IMG_4618-*.webp; do
  npx wrangler r2 object put "images/canvas/$(basename "$f")" \
    --file "$f" --content-type image/webp --remote
done

# 3. Add the entry to content/canvas.json
#    (front of the array = shown first). Schema + fields shown in Step 2 below.

# 4. Publish the manifest to R2
node scripts/sync-manifest.mjs canvas

# 5. Verify (manifest entry + a 200 on the image)
curl -s  https://img.alvamoor.com/canvas/index.json | head
curl -sI https://img.alvamoor.com/canvas/IMG_4618-1200.webp
```

Live within ~60s, **no redeploy** — the manifest is fetched at request time with a
60s cache window. Per-step detail and the schema are below.

---

Both galleries are fed the same way — R2, one manifest each. Figure out which
medium the image belongs to:

| Gallery      | Route     | Image source                     | Manifest             |
| ------------ | --------- | -------------------------------- | -------------------- |
| Paper works  | `/paper`  | Cloudflare R2 (`paper/` folder)  | `content/paper.json` |
| Canvas works | `/canvas` | Cloudflare R2 (`canvas/` folder) | `content/canvas.json` |

Originals (HEIC straight off the phone, etc.) live in `content/<medium>/`.
The base name (e.g. `IMG_4618`) is the key stem; variants are
`<base>-<width>.webp`.

### Step 1 — Generate webp variants

`scripts/gen-image-variants.mjs` reads a directory of images and emits
`640 / 1024 / 1200`px webp (quality 80, capped at 1200, never upscaled) into
`./image-variants/`. It decodes HEIC via `sharp`, falling back to macOS `sips`.

To convert just **one** new file (the script processes a whole directory, so
isolate it in a temp dir first):

```bash
tmp=$(mktemp -d) && cp content/canvas/IMG_4618.heic "$tmp"/ \
  && node scripts/gen-image-variants.mjs "$tmp" image-variants && rm -rf "$tmp"
# -> image-variants/IMG_4618-640.webp, -1024.webp, -1200.webp
```

`image-variants/` is git-ignored — the files live in R2,
not the repo.

### Step 2 — Paper / canvas works (`/paper`, `/canvas`)

These are driven by JSON manifests in R2, so **no redeploy** is needed — changes
go live within the ~60s revalidate window.

1. **Upload the variants to R2.** This is the "upload script" — a `wrangler`
   loop. `--remote` is REQUIRED (without it, writes go to the local miniflare
   store and silently never reach the real bucket). Requires `npx wrangler login`
   once. Bucket is `images`; put files in the `<medium>/` folder:

   ```bash
   for f in image-variants/IMG_4618-*.webp; do
     npx wrangler r2 object put "images/canvas/$(basename "$f")" \
       --file "$f" --content-type image/webp --remote
   done
   ```

2. **Add the manifest entry** to `content/canvas.json` (or `paper.json`). Array
   order = display order. Schema:

   ```json
   {
     "base": "IMG_4618",
     "title": { "en": "Untitled", "de": "Ohne Titel" },
     "mediumLabel": { "en": "Pigments on canvas", "de": "Pigmente
      auf Leinwand" },
     "year": 2026,
     "widthCm": 130,
     "heightCm": 170,
     "status": "available"
   }
   ```

   `base` must match the uploaded file stem. Canvas works are **always
   "Pigments on canvas"**. `status` is `available` | `sold`.

3. **Publish the manifest** — uploads `content/<medium>.json` to
   `<medium>/index.json` in R2:

   ```bash
   node scripts/sync-manifest.mjs canvas
   ```

   It validates required fields first. `--remote` is baked into the script.

> Upload images **before** publishing the manifest — an entry whose
> `<base>-<width>.webp` files aren't in R2 yet shows a broken image.

### Verify

```bash
curl -s  https://img.alvamoor.com/canvas/index.json          # entry present
curl -sI https://img.alvamoor.com/canvas/IMG_4618-1200.webp  # expect 200, image/webp
```

There's also a self-service **`/admin`** UI (Cloudflare Access-gated) that does
the resize + R2 upload + manifest write in the browser — the manual flow above
is the power-user / scripted fallback. See `docs/r2-image-migration.md` for the
full background.

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
  fix it: re-upload the variant (Step 1 + Step 2 above). Exits non-zero so it is
  hard to miss.

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
