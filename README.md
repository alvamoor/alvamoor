# alva moor

The website for the artist **alva moor** — a bilingual (EN/DE) portfolio with a
3D landing scene and gallery views of works on paper and canvas.

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Hosting:** Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare)
- **i18n:** [next-intl](https://next-intl.dev/) (`en` default, `de`)
- **Images/data:** Cloudflare R2 (served from `img.alvamoor.com`)
- **3D:** react-three-fiber / three.js

---

## Prerequisites

- **Node 20+** and npm (the repo uses the npm `package-lock.json`).
- For **deploying** or touching R2: a Cloudflare account with access to this
  project, and `wrangler` authenticated (`npx wrangler login`).

## Getting started

```bash
npm install     # also installs the git hooks (via the "prepare" script)
npm run dev     # http://localhost:3000
```

Default-locale (English) pages are unprefixed (`/paper`); German is under
`/de` (`/de/paper`). Routes worth knowing:

| Route      | What it is                                              |
| ---------- | ------------------------------------------------------- |
| `/`        | Landing page                                            |
| `/paper`   | Works on paper (data from R2)                           |
| `/canvas`  | Works on canvas (data from R2)                          |
| `/gallery` | 3D scene (static images bundled from `public/artworks`) |
| `/admin`   | Works admin — add/edit/reorder works (see below)        |

## Environment variables

The app runs with zero config locally. Optional overrides:

| Variable                     | Purpose                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | Point image/manifest fetches somewhere other than `https://img.alvamoor.com` (local testing).      |
| `CF_ACCESS_TEAM_DOMAIN`      | Cloudflare Access team domain used to protect `/admin` in production.                              |
| `CF_ACCESS_AUD`              | Access application Audience (AUD) tag. When unset, `/admin` is open in dev only (blocked in prod). |

Admin auth details live in `app/lib/admin-auth.ts` and
[`docs/cloudflare-access-setup.md`](docs/cloudflare-access-setup.md).

## Scripts

| Command              | Does                                                   |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Next dev server                                        |
| `npm run build`      | Next production build                                  |
| `npm run typecheck`  | `tsc --noEmit`                                         |
| `npm run lint`       | ESLint (`lint:fix` to auto-fix)                        |
| `npm run format`     | Prettier write (`format:check` to check)               |
| `npm test`           | Run the unit tests once (Vitest)                       |
| `npm run test:watch` | Vitest in watch mode                                   |
| `npm run verify`     | `typecheck` + `lint` + `test` — the pre-push gate      |
| `npm run preview`    | Build + run the Cloudflare Worker locally (OpenNext)   |
| `npm run deploy`     | Build + deploy to Cloudflare                           |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |

## Project structure

```
app/
  [locale]/           localized routes (landing + /paper /canvas galleries)
  admin/              works admin UI (client) — add/edit/reorder/tag works
  api/admin/          admin API (manifest read/write + image upload) behind Access
  gallery/            the 3D react-three-fiber scene (/gallery)
  lib/                data layer: artworks.ts (R2 manifests), admin-r2.ts, admin-auth.ts
content/              *.json manifests + originals staging (git-ignored images)
messages/             en.json / de.json translation catalogs
i18n/                 next-intl routing + request config
scripts/              gen-image-variants.mjs, sync-manifest.mjs
docs/                 setup + concept notes
```

## Content & images

There are **two galleries**, fed differently:

- **`/paper` and `/canvas`** read JSON manifests from R2 (`<medium>/index.json`)
  and images from the same bucket. Manifest changes go live within ~60s, **no
  redeploy**. Local staging copies live in `content/<medium>.json`; publish with
  `node scripts/sync-manifest.mjs <paper|canvas>`.
- **`/gallery`** (3D scene) uses static images bundled from `public/artworks/`
  and the `BASE_NAMES` array in `app/gallery/artworks.ts`; changes require a
  redeploy.

**Adding an artwork** (HEIC → webp variants → R2 → manifest) is done with
`scripts/gen-image-variants.mjs` (generate the webp sizes) and
`scripts/sync-manifest.mjs` (publish the manifest to R2).

## Internationalization

Locales and prefix strategy are defined in `i18n/routing.ts` (`en` default,
`de`, `localePrefix: "as-needed"`). UI strings live in `messages/en.json` and
`messages/de.json` — keep both in sync when adding a key.

## Testing

Unit tests use **Vitest** and live next to the code they cover as
`*.test.ts`, exercising pure logic (data mapping, manifest validation) with the
network mocked — no Next runtime or live R2 needed.

```bash
npm test           # run once
npm run test:watch # watch mode
```

Current coverage: `app/lib/artworks.test.ts` (medium guard + manifest → Artwork
mapping) and `app/lib/admin-r2.test.ts` (`validateEntries`).

## Git hooks

A **pre-push** hook (Husky) runs `npm run verify` (typecheck + lint + tests) and
blocks the push if anything fails. The hook installs automatically on
`npm install` via the `prepare` script.

```bash
git push --no-verify   # bypass in an emergency
```

## Deployment

Deploys run on Cloudflare via OpenNext:

```bash
npm run deploy         # build + deploy (needs `wrangler login`)
npm run preview        # build + run the Worker locally first
```

See [`docs/`](docs/) for Cloudflare Access setup, the R2 image migration, and
the landing-page concept.
