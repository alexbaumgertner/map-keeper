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

## Constitution

Non-negotiables live in `.specify/memory/constitution.md` (allowlisted sources, human confirmation, no bulk edits, changeset provenance).

## Spec Kit

Feature: `specs/001-claim-monitoring/`
