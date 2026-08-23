# Mapkeeper

Keep your business on the map. Claim + monitoring for OpenStreetMap venues.

## Dev requirements (read this first)

1. **OAuth redirect must use `127.0.0.1`, not `localhost`.**  
   Run: `pnpm dev` (binds `127.0.0.1:3000`).  
   Register redirect: `http://127.0.0.1:3000/api/v1/auth/osm/callback`

2. **Use the OSM *dev* API for destructive testing**  
   Base: `https://master.apis.dev.openstreetmap.org/`  
   Create a separate account and OAuth app there before any production changeset.

3. Copy `.env.example` to `.env.local` in `apps/web` (or repo root) and set `OSM_OAUTH_*`, optional `DATABASE_URL` (Neon+PostGIS). Without `DATABASE_URL`, the app uses an in-memory store for local claim demos.

## Accounts to register

Create these in order. Local-only work needs OSM Dev (and optionally GitHub). Production needs everything in the **Required** table.

### Overview

| Service | When | What you get | Env vars |
|---------|------|----------------|----------|
| [OpenStreetMap **Dev**](https://master.apis.dev.openstreetmap.org/) | Local + first deploys | Separate OSM account + OAuth 2 app | `OSM_API_BASE`, `OSM_OAUTH_*` |
| [OpenStreetMap **Prod**](https://www.openstreetmap.org/) | Real map edits only | Production OSM account + OAuth 2 app | same, with prod API base |
| [GitHub](https://github.com/) (or GitLab/Bitbucket) | Deploy | Repo for Vercel import | — |
| [Vercel](https://vercel.com/) | Deploy | Hosting, env vars, Marketplace | — |
| [Neon](https://neon.tech/) | Deploy (via Vercel) | Postgres + PostGIS | `DATABASE_URL` |
| [Resend](https://resend.com/) | Email digests | API key + verified domain | `RESEND_API_KEY`, `EMAIL_FROM` |
| [Inngest](https://www.inngest.com/) | Monitoring jobs | Event + signing keys | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| Tiles: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) or [AWS S3](https://aws.amazon.com/s3/) (or [Protomaps](https://protomaps.com/)) | Basemap | Public `.pmtiles` URL | `PROTOMAPS_URL` |

**Skip for now:** Overpass (public `https://overpass-api.de/api/interpreter` is the default). LocationIQ / Photon geocoding. Google Business Profile (`FEATURE_GBP` stays `false` until approved).

`SESSION_SECRET` is not a third-party account — generate it locally: `openssl rand -hex 32`.

### 1. OpenStreetMap Dev (do this first)

Production OSM logins **do not** work on the test API. You need a **second** account on the dev server before any destructive testing or local OAuth.

1. Open [https://master.apis.dev.openstreetmap.org/](https://master.apis.dev.openstreetmap.org/).
2. **Sign up** (new email is fine; this is a sandbox, not the live map).
3. Confirm the account email if prompted, then sign in.
4. Open **My Settings** → **OAuth 2 applications** → **Register new application**.
   - Direct link (while signed in): [https://master.apis.dev.openstreetmap.org/oauth2/applications](https://master.apis.dev.openstreetmap.org/oauth2/applications)
5. Fill in:
   - **Name:** `Mapkeeper local` (any label).
   - **Redirect URI:** `http://127.0.0.1:3000/api/v1/auth/osm/callback`  
     Must be `127.0.0.1`, not `localhost`. For a Vercel preview later, add a second URI: `https://<preview-or-prod-host>/api/v1/auth/osm/callback`.
   - **Confidential application:** yes (server-side secret).
   - **Permissions (scopes):** `write_api` and `read_prefs` only.
6. Save. Copy **Client ID** and **Client Secret** into `.env.local`:

   ```
   OSM_API_BASE=https://master.apis.dev.openstreetmap.org
   OSM_OAUTH_CLIENT_ID=…
   OSM_OAUTH_CLIENT_SECRET=…
   OSM_OAUTH_REDIRECT_URI=http://127.0.0.1:3000/api/v1/auth/osm/callback
   ```

### 2. OpenStreetMap Production (only when ready to edit the live map)

Do this **after** community/wiki readiness. Use a **different** OAuth app (and usually a dedicated OSM user), not the dev-server credentials.

1. Sign up or sign in at [https://www.openstreetmap.org/user/new](https://www.openstreetmap.org/user/new).
2. **My Settings** → **OAuth 2 applications** → **Register new application**  
   ([https://www.openstreetmap.org/oauth2/applications](https://www.openstreetmap.org/oauth2/applications)).
3. Same scopes (`write_api`, `read_prefs`). Redirect URI:

   `https://<your-domain>/api/v1/auth/osm/callback`

4. Set `OSM_API_BASE=https://api.openstreetmap.org` and the new client ID/secret on Vercel (Production).

### 3. GitHub (or GitLab / Bitbucket)

Vercel imports from a git remote.

1. Create an account at [https://github.com/signup](https://github.com/signup) if you do not have one.
2. Create a repository and push this project (`git remote add origin …` then `git push -u origin HEAD`).

### 4. Vercel

1. Sign up at [https://vercel.com/signup](https://vercel.com/signup) — **Continue with GitHub** is simplest.
2. **Add New… → Project** → import this repo.
3. Set **Root Directory** to `apps/web`, **Framework Preset** Next.js, **Node.js** 24.x.
4. Do not deploy until the env vars in [Environment variables](#3-environment-variables) are set (OAuth and sessions will fail).

After the project exists: `vercel link` from the repo (or `apps/web`) so you can `vercel env add` / `vercel env pull`.

### 5. Neon (Postgres + PostGIS)

Prefer the Vercel Marketplace so `DATABASE_URL` is injected automatically.

1. In the Vercel project → **Storage** / **Integrations** → add **Neon**.
2. Create a database (Hobby is enough to start). Accept the env var connection to this Vercel project.
3. In the [Neon SQL Editor](https://console.neon.tech/), run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

4. Confirm `DATABASE_URL` (and often `DATABASE_URL_UNPOOLED`) under Vercel **Settings → Environment Variables**.
5. Apply migrations with that URL (`pnpm db:generate` then `pnpm db:migrate`).

Standalone signup (if you skip Marketplace): [https://console.neon.tech/signup](https://console.neon.tech/signup) → create a project → copy the connection string into Vercel yourself.

### 6. Resend (email)

1. Sign up at [https://resend.com/signup](https://resend.com/signup).
2. **API Keys** → **Create API Key** (permission: Sending access). Copy into `RESEND_API_KEY`.
3. **Domains** → **Add Domain** (the domain you own for `EMAIL_FROM`, e.g. `yourdomain.com`).
4. Add the DNS records Resend shows (SPF, DKIM, optionally DMARC) at your DNS host. Wait until the domain is **Verified**.
5. Set `EMAIL_FROM` to a verified address, e.g. `Mapkeeper <noreply@yourdomain.com>`.

Until the domain is verified, Resend only allows sending to **your own** signup email (useful for a single test).

### 7. Inngest (background jobs)

1. Sign up at [https://app.inngest.com/sign-up](https://app.inngest.com/sign-up).
2. Create an app (or use the default).
3. Open **Keys** (or **Manage** → keys) and copy:
   - **Event key** → `INNGEST_EVENT_KEY`
   - **Signing key** → `INNGEST_SIGNING_KEY` (used to verify `/api/inngest`)
4. Register the serve URL:

   `https://<your-domain>/api/inngest`

5. Redeploy Vercel after the keys are set. Confirm reconcile / digest / freshness functions show as synced in the Inngest dashboard.

Local: you can run the [Inngest Dev Server](https://www.inngest.com/docs/local-development) without a cloud account (`npx inngest-cli@latest dev`). Cloud keys are for deployed environments.

### 8. Map tiles (Protomaps / object storage)

Do **not** use Google (or other OSM-blacklisted) imagery.

**Option A — Cloudflare R2 (typical):**

1. Sign up at [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. **R2** → create a bucket → upload a `.pmtiles` file (or generate one with [Planetiler](https://github.com/protomaps/basemaps) / Protomaps tools).
3. Enable a **public** custom domain or R2.dev public access for that object.
4. Set `PROTOMAPS_URL` to the public base URL / tile template MapLibre expects.

**Option B — AWS S3 + CloudFront:** same idea (public object URL). Sign up at [https://aws.amazon.com/](https://aws.amazon.com/).

**Option C — Protomaps hosted:** see [https://protomaps.com/](https://protomaps.com/) if you want a hosted tiles endpoint instead of self-hosting.

Until `PROTOMAPS_URL` is set, local/dev may use a temporary OSM raster basemap for demos only.

### Suggested order

1. OSM Dev account + OAuth app → local `pnpm dev` and sign-in.
2. GitHub + Vercel project (do not go live yet).
3. Neon via Vercel Marketplace → migrate schema.
4. Resend domain + API key.
5. Inngest app + keys; point it at `/api/inngest`.
6. Host `.pmtiles` and set `PROTOMAPS_URL`.
7. Fill remaining Vercel env vars (`SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, OSM redirect for HTTPS).
8. OSM **production** OAuth only when you are ready to write live changesets.

## Monorepo

```bash
pnpm install
pnpm dev          # apps/web
pnpm dev:sync     # apps/sync worker stubs
```

Packages: `@mapkeeper/osm`, `@mapkeeper/db`, `@mapkeeper/tagging`, `@mapkeeper/matching`

## Deploy on Vercel (with database)

Mapkeeper’s web app lives in `apps/web`. Background jobs are Inngest functions served from that app’s `/api/inngest` route.

### 1. Create the Vercel project

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com) → **Add New… → Project** → import the repo.
3. **Framework Preset:** Next.js.
4. **Root Directory:** `apps/web` (Edit → select `apps/web`).
5. **Install Command:** leave default, or use `npm install` / `pnpm install` to match your lockfile under `apps/web`.
6. **Build Command:** `next build` (default for the web app).
7. **Node.js:** 24.x (Project Settings → General → Node.js Version), matching `.nvmrc`.

Do not deploy without env vars below — OAuth and sessions will fail.

### 2. Database (Neon + PostGIS)

1. In the Vercel project → **Storage** / **Integrations** → add **Neon** (Marketplace).
2. Create a database; enable the **PostGIS** extension in the Neon SQL editor:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. Neon should inject `DATABASE_URL` (and often `DATABASE_URL_UNPOOLED`) into the Vercel project. Confirm under **Settings → Environment Variables** for Production, Preview, and Development as needed.
4. Apply schema migrations from a machine with the production URL:

   ```bash
   export DATABASE_URL='postgresql://…'   # from Vercel / Neon
   pnpm db:generate
   pnpm db:migrate
   ```

   Or run the generated SQL in the Neon console. Without `DATABASE_URL`, the app falls back to an in-memory store (not for production).

### 3. Environment variables

In **Vercel → Project → Settings → Environment Variables**, set at least:

| Variable | What to set |
|----------|-------------|
| `DATABASE_URL` | Neon connection string (usually from the Neon integration) |
| `SESSION_SECRET` | Random string ≥ 32 characters (`openssl rand -hex 32`) |
| `OSM_API_BASE` | Dev: `https://master.apis.dev.openstreetmap.org` · Prod: `https://api.openstreetmap.org` |
| `OSM_OAUTH_CLIENT_ID` | From your OSM OAuth application |
| `OSM_OAUTH_CLIENT_SECRET` | From your OSM OAuth application |
| `OSM_OAUTH_REDIRECT_URI` | `https://<your-domain>/api/v1/auth/osm/callback` |
| `RESEND_API_KEY` | From [Resend](https://resend.com) |
| `EMAIL_FROM` | Verified sender, e.g. `Mapkeeper <noreply@yourdomain.com>` |
| `PROTOMAPS_URL` | Base URL or tile template for your `.pmtiles` / Protomaps endpoint (R2/S3 or Protomaps host) |
| `INNGEST_EVENT_KEY` | From [Inngest](https://www.inngest.com) → your app |
| `INNGEST_SIGNING_KEY` | From Inngest (verifies `/api/inngest`) |
| `OVERPASS_URL` | Optional; default public Overpass is fine for early traffic |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` (sitemap/canonical URLs) |
| `FEATURE_GBP` | `false` unless GBP is approved and enabled |

Apply the same set to **Production** (and Preview if you test OAuth on preview URLs).

CLI alternative (from repo root, after `vercel link`):

```bash
vercel env add DATABASE_URL production
vercel env add SESSION_SECRET production
vercel env add OSM_API_BASE production
vercel env add OSM_OAUTH_CLIENT_ID production
vercel env add OSM_OAUTH_CLIENT_SECRET production
vercel env add OSM_OAUTH_REDIRECT_URI production
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
vercel env add PROTOMAPS_URL production
vercel env add INNGEST_EVENT_KEY production
vercel env add INNGEST_SIGNING_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
```

Pull into local when needed: `vercel env pull .env.local`.

### 4. OpenStreetMap OAuth (`OSM_API` + `OSM_OAUTH`)

1. Choose API host via `OSM_API_BASE`:
   - **Staging / first deploy:** `https://master.apis.dev.openstreetmap.org` (separate accounts + OAuth app).
   - **Production map edits:** `https://api.openstreetmap.org` only after community/wiki readiness.
2. Create an OAuth 2 application on that same host (OSM website → OAuth2 applications).
3. **Redirect URI** must match exactly:

   `https://<your-vercel-domain>/api/v1/auth/osm/callback`

   Add a second redirect for Preview if you use branch URLs.
4. Request scopes **`write_api`** and **`read_prefs`** only (constitution).
5. Copy Client ID / Secret into `OSM_OAUTH_CLIENT_ID` and `OSM_OAUTH_CLIENT_SECRET`.

Local still uses `http://127.0.0.1:3000/...` — production must use the HTTPS Vercel URL, not `localhost`.

### 5. Resend (email digests)

1. Create a Resend account → API key → `RESEND_API_KEY`.
2. Verify your domain → set `EMAIL_FROM` to an address on that domain.
3. Digests use the user’s OSM account email when available; missing email fails soft (in-app notice).

### 6. Protomaps (`PROTOMAPS_URL`)

1. Host a `.pmtiles` file (or Protomaps-compatible tiles) on R2/S3/CDN.
2. Set `PROTOMAPS_URL` to the public base URL / tile URL the MapLibre style expects.
3. Do **not** use Google (or other OSM-blacklisted) imagery.

Until `PROTOMAPS_URL` is set, local/dev may use a temporary OSM raster basemap for demos only.

### 7. Inngest (monitoring jobs)

1. Create an Inngest app → copy **Event key** and **Signing key**.
2. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on Vercel.
3. In Inngest, register the sync URL:

   `https://<your-domain>/api/inngest`

4. Redeploy after adding keys so the serve route can verify signatures.
5. Confirm cron/event functions (reconcile, digest, freshness) appear as synced in the Inngest dashboard.

### 8. Deploy and smoke-test

```bash
vercel --prod
# or push to the production Git branch
```

Check:

1. `https://<domain>/` loads.
2. Sign-in with OSM completes and returns to `/claim` or `/places`.
3. Claim/search works (Overpass + DB).
4. Inngest dashboard shows the app connected.
5. Resend test/digest path does not error when OSM email is present.

### 9. Useful links

- Env template: `.env.example`
- Full local var list and OSM notes: this README (Dev requirements)
- Spec / contracts: `specs/001-claim-monitoring/`

## Constitution

Non-negotiables live in `.specify/memory/constitution.md` (allowlisted sources, human confirmation, no bulk edits, changeset provenance).

## Spec Kit

Feature: `specs/001-claim-monitoring/`
