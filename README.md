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
