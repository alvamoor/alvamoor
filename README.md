# alva moor

The website for the artist **alva moor** — a bilingual (EN/DE) portfolio with
gallery views of works on paper and canvas.

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19, Turbopack)
- **Hosting:** Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare)
- **i18n:** [next-intl](https://next-intl.dev/) (`en` default, `de`)
- **Images/data:** Cloudflare R2 (served from `img.alvamoor.com`)

---

## Prerequisites

- **Node 20+** and **pnpm** (the repo uses `pnpm-lock.yaml`; a `preinstall`
  guard blocks npm/yarn). Enable it with `corepack enable` if you don't have it.
- For **deploying** or touching R2: a Cloudflare account with access to this
  project, and `wrangler` authenticated (`pnpm dlx wrangler login`).

## Getting started

```bash
pnpm install    # also installs the git hooks (via the "prepare" script)
pnpm dev        # http://localhost:3000
```

Default-locale (English) pages are unprefixed (`/works/paper`); German is under
`/de` (`/de/works/paper`). Routes worth knowing:

| Route           | What it is                                              |
| --------------- | ------------------------------------------------------- |
| `/`             | Landing — wordmark, menu, nothing else                  |
| `/about`        | The artist statement                                    |
| `/contact`      | Email, Instagram, studio line                           |
| `/works`        | Redirects to `/works/canvas`                            |
| `/works/canvas` | Works on canvas (data from R2)                          |
| `/works/paper`  | Works on paper (data from R2)                           |
| `/admin`        | Works admin — add/edit/reorder works (see below)        |

## Environment variables & secrets

The app runs with zero config locally. Two different mechanisms, easy to confuse:

| Variable                     | Kind                   | Set where                                   | Purpose                                                                       |
| ---------------------------- | ---------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Build-time, **public** | shell env at build time, or `.env.local`    | Point image/manifest fetches somewhere other than `https://img.alvamoor.com`. |
| `CF_ACCESS_TEAM_DOMAIN`      | **Worker secret**      | `wrangler secret put` (`.dev.vars` locally) | Cloudflare Access team domain, e.g. `loerk.cloudflareaccess.com`.             |
| `CF_ACCESS_AUD`              | **Worker secret**      | `wrangler secret put` (`.dev.vars` locally) | Access application Audience (AUD) tag.                                        |

`NEXT_PUBLIC_*` is inlined into the client bundle and is therefore public by
definition — never put anything sensitive behind that prefix.

Both `CF_ACCESS_*` values are **required in production**. `app/lib/admin-auth.ts`
fails closed: if either is missing, _every_ `/api/admin/*` request returns 401 —
the works list, uploads and saves alike — even though Cloudflare Access itself
let you through to the Worker. The 401 body now names the cause. Under
`pnpm dev` both are unset and admin auth is bypassed.

Admin auth details live in `app/lib/admin-auth.ts` and
[`docs/cloudflare-access-setup.md`](docs/cloudflare-access-setup.md).

### Managing Worker secrets

Secrets live on the deployed Worker, never in the repo. `wrangler.jsonc`
deliberately declares no `vars` for these names — a `var` and a secret sharing a
name conflict, and an empty `var` will shadow the real secret.

```bash
pnpm dlx wrangler login                              # once, if not authenticated

# List which secrets exist (names only — values are never readable)
pnpm dlx wrangler secret list

# Add *or* update one — `put` does both. It prompts; type the value there.
pnpm dlx wrangler secret put SECRET_NAME

# Or read the value from a file instead of the prompt (long values, CI)
pnpm dlx wrangler secret put SECRET_NAME < value.txt

# Delete one
pnpm dlx wrangler secret delete SECRET_NAME
```

Worth knowing:

- `put` creates or overwrites.
- Every `secret` command **creates a new Worker version and deploys it
  immediately**, so a secret change takes effect without `pnpm deploy`.
- Values are **write-only**: `secret list` returns names only. If a value is
  lost, rotate it — it cannot be read back.
- **Keep the value off the command line.** `put` takes only the _name_ —
  wrangler then asks for the value and you type it at that prompt. Typing at a
  prompt is safe: your shell records the command you ran, not what a program
  later reads from stdin. So `wrangler secret put NAME` is fine, whereas
  `echo 'value' | wrangler secret put NAME` writes the value straight into
  `~/.zsh_history`. Use the prompt, or `< file` for long values and CI.
- Secrets are per-Worker **and per-environment** — pass `--env <name>` if this
  project ever gains environments in `wrangler.jsonc`.
- `.dev.vars` and `.dev.vars.*` are git-ignored.

To recover this project's `CF_ACCESS_AUD` from Cloudflare, read the `aud` claim
of the meta JWT in the Access redirect:

```bash
curl -sI https://alvamoor.com/admin | grep -i '^location:' \
  | sed -E 's/.*[?&]meta=([^&]*).*/\1/' | cut -d. -f2 | tr '_-' '/+' \
  | base64 -d 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).aud))"
```

**Local secrets:** for `pnpm preview` (the real Worker runtime locally), put
values in a git-ignored `.dev.vars` at the repo root:

```
CF_ACCESS_TEAM_DOMAIN=loerk.cloudflareaccess.com
CF_ACCESS_AUD=<aud tag>
```

## Scripts

| Command           | Does                                                   |
| ----------------- | ------------------------------------------------------ |
| `pnpm dev`        | Next dev server                                        |
| `pnpm build`      | Next production build                                  |
| `pnpm typecheck`  | `tsc --noEmit`                                         |
| `pnpm lint`       | ESLint (`lint:fix` to auto-fix)                        |
| `pnpm format`     | Prettier write (`format:check` to check)               |
| `pnpm test`       | Run the unit tests once (Vitest)                       |
| `pnpm test:watch` | Vitest in watch mode                                   |
| `pnpm verify`     | `typecheck` + `lint` + `test` — the pre-push gate      |
| `pnpm audit`      | Report known vulnerabilities in dependencies           |
| `pnpm preview`    | Build + run the Cloudflare Worker locally (OpenNext)   |
| `pnpm deploy`     | Build + deploy to Cloudflare                           |
| `pnpm cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |

## Project structure

```
app/
  [locale]/
    layout.tsx        the one shell: backdrop, wordmark, nav, switcher, footer
    template.tsx      re-mounts per navigation, so content can fade in
    page.tsx          the landing — no content, only the state marker
    about/ contact/ works/
    shell.module.css  shell + both of its states; pages.module.css: text pages
  components/         Backdrop, Wordmark, SiteNav, LocaleSwitcher, TileField
  admin/              works admin UI (client) — add/edit/reorder/tag works
  api/admin/          admin API (manifest read/write + image upload) behind Access
  lib/                data layer: artworks.ts (R2 manifests), admin-r2.ts, admin-auth.ts
content/              *.json manifests + originals staging (git-ignored images)
messages/             en.json / de.json translation catalogs
i18n/                 next-intl routing + request config
scripts/              gen-image-variants.mjs, sync-manifest.mjs
docs/                 setup + concept notes
```

## Content & images

**`/works/paper` and `/works/canvas`** read JSON manifests from R2
(`<medium>/index.json`) and images from the same bucket. Manifest changes go live
within ~60s, **no redeploy**. Local staging copies live in `content/<medium>.json`;
publish with `node scripts/sync-manifest.mjs <paper|canvas>`.

**Adding an artwork** — two independent ways:

- **`/admin` UI** (usual): resizes the image in the browser
  (`app/admin/resize.ts`), uploads the webp variants to R2, and writes the
  manifest — no scripts, no redeploy.
- **Manual / bulk CLI:** `scripts/gen-image-variants.mjs` (HEIC → webp sizes),
  then edit `content/<medium>.json` and publish with
  `scripts/sync-manifest.mjs`.

### Caching

Images and manifests are cached very differently on purpose, so uploads go live
fast while images load instantly on repeat views:

| Object                | `Cache-Control`                       | Why                                                                        |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `<medium>/*.webp`     | `public, max-age=31536000, immutable` | Filenames are versioned, so a variant's bytes never change — cache 1 year. |
| `<medium>/index.json` | `max-age=60`                          | Manifest edits (add/edit/reorder) must appear quickly.                     |

- The long image cache is set two ways that should agree: the `/admin` upload
  route stamps it into R2 object metadata (`app/api/admin/upload/route.ts`), and
  a **Cloudflare Cache Rule** on the `img.alvamoor.com` zone forces it for
  `*.webp` (covers bulk-migrated images that predate the route). The manifest is
  deliberately **not** matched by that rule.
- **New uploads appear within ~60s** — gated only by the manifest
  (`revalidate: 60` in `app/lib/artworks.ts` + its `max-age=60`), never by the
  image cache. A new work is a new filename, so nothing stale can be served.
- **Replacing** a work's picture under the **same `base`** is the one gotcha:
  the 1-year/immutable cache keeps serving the old bytes. Use a new `base`
  (preferred), or overwrite and then **purge** (below).
- Verify with a **GET** (`HEAD` always reports `DYNAMIC` and is misleading):
  ```bash
  curl -s -o /dev/null -D - "https://img.alvamoor.com/paper/<base>-640.webp" \
    | grep -iE "cache-control|cf-cache-status"
  ```

#### Purging the cache after overwriting an image

Uploading to R2 replaces the **origin** object, but the edge keeps serving the
cached copy for up to a year. Until you purge, `cf-cache-status: HIT` with a
large `age` and the old `content-length` — the R2 object and what visitors get
are simply different files.

In the Cloudflare dashboard:

1. Select the **`alvamoor.com`** zone. (`img.alvamoor.com` is a subdomain of it,
   not a separate zone — this is the easy mistake.)
2. **Caching** → **Configuration**.
3. In the **Purge Cache** section, choose **Custom Purge**.
4. **Purge by:** **URL**.
5. Paste the full URLs, one per line — including `https://` and every width
   variant you replaced:
   ```
   https://img.alvamoor.com/canvas/<base>-640.webp
   https://img.alvamoor.com/canvas/<base>-1024.webp
   https://img.alvamoor.com/canvas/<base>-1200.webp
   ```
6. Click **Purge**.

Then confirm the edge has let go — `cf-cache-status` should be `MISS` on the
next request, and the size should match the new object:

```bash
curl -s -o /dev/null -D - "https://img.alvamoor.com/canvas/<base>-1200.webp" \
  | grep -iE "cf-cache-status|content-length"
```

Notes:

- **Prefer Custom Purge over Purge Everything.** Both work, but Purge Everything
  flushes the whole zone and every visitor re-fetches everything until it
  refills. Custom is limited to **30 URLs per request** on Free/Pro/Business —
  batch if you're replacing more than 10 works.
- Wildcards are **not** supported for single-file purge; list each variant.
- The hostname is lowercased automatically, but **the path is case-sensitive**.
- Purging is only needed for **overwrites**. A new work has a new `base`, so
  nothing stale can exist — that's the whole point of versioned filenames.

## Internationalization

Locales and prefix strategy are defined in `i18n/routing.ts` (`en` default,
`de`, `localePrefix: "as-needed"`). UI strings live in `messages/en.json` and
`messages/de.json` — keep both in sync when adding a key.

## Testing

Unit tests use **Vitest** and live next to the code they cover as
`*.test.ts`, exercising pure logic (data mapping, manifest validation) with the
network mocked — no Next runtime or live R2 needed.

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

Current coverage: `app/lib/artworks.test.ts` (medium guard + manifest → Artwork
mapping) and `app/lib/admin-r2.test.ts` (`validateEntries`).

## Git hooks

A **pre-push** hook (Husky) blocks the push if any commit being pushed has an
author email other than the project identity (the GitHub noreply address in
`.husky/pre-push`), or if `pnpm verify` (typecheck + lint + tests) fails. The
hook installs automatically on `pnpm install` via the `prepare` script.

```bash
git push --no-verify   # bypass in an emergency
```

## Building

There are **two** build stages. `pnpm build` only does the first; deploying
needs both.

```bash
pnpm build                          # 1. Next production build      -> .next/
npx opennextjs-cloudflare build     # 2. wrap it as a Worker        -> .open-next/
```

`pnpm preview` and `pnpm deploy` run **both** stages for you, so you rarely
invoke them separately:

```bash
pnpm preview           # both stages + run the Worker locally in workerd
pnpm deploy            # both stages + deploy to Cloudflare (needs wrangler login)
```

Notes:

- **`pnpm build` runs `tsc` but _not_ ESLint.** Next 16 removed linting from
  `next build`, so a Prettier/ESLint violation no longer fails the build — run
  `pnpm verify` (or the pre-push hook) to catch those.
- **Turbopack is the builder.** It's the default in Next 16 for both `dev` and
  `build`; `--turbopack` is no longer needed. If a dependency ever forces a
  webpack config, `next build --webpack` opts out.
- **`next dev` writes to `.next/dev`**, separate from `next build`, so the two
  can run concurrently.
- **Stage 2 is where Cloudflare-specific breakage shows up.** Stage 1 can
  succeed while stage 2 mis-handles an asset — worth running when you add
  anything non-JS (e.g. the `.wasm` encoder in `app/admin/resize.ts`). Confirm
  an asset actually ships with:
  ```bash
  find .open-next/assets -name "*.wasm"
  ```
- **Ignore the `middleware` deprecation warning — do _not_ run the
  `middleware-to-proxy` codemod.** Next 16 renames the convention to `proxy`,
  but `proxy` runs on the **Node.js runtime only and cannot be configured**, and
  `@opennextjs/cloudflare` does not yet support Node middleware. Migrating would
  break locale routing on Cloudflare. `middleware.ts` still works in 16; revisit
  when OpenNext supports it.
- `pnpm verify` (typecheck + lint + tests) is the faster pre-push gate and does
  **not** build.
- Both output directories are git-ignored and safe to delete; `rm -rf .next
.open-next` forces a clean rebuild.

## Deployment

Deploys run on Cloudflare via OpenNext (see **Building** above for the two
stages):

```bash
pnpm deploy            # build + deploy (needs `wrangler login`)
pnpm preview           # build + run the Worker locally first
```

See [`docs/`](docs/) for Cloudflare Access setup, the R2 image migration, and
the landing-page concept.
