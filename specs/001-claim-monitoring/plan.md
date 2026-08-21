# Implementation Plan: Claim & Monitoring MVP

**Branch**: `001-claim-monitoring` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-claim-monitoring/spec.md`

## Summary

Mapkeeper helps food and hospitality owners claim venues on OpenStreetMap, publish corrections under their own OSM identity, and get notified when watched map objects change. The technical approach is a pnpm monorepo: Next.js App Router on Vercel for the web/SEO surface; Neon Postgres + PostGIS + Drizzle for watch links, attributes, and candidates; a sync worker for version polling and digests; auditable OSM packages (`osm`, `tagging`) so the edit path stays reviewable; client-side publishes via `osm-api` with mandatory diff preview and three-way merge on version conflicts. Discovery uses Overpass; monitoring polls OSM API 0.6 batch endpoints—not planet diffs—at MVP scale.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 (Vercel default)

**Primary Dependencies**: Next.js 16+ (App Router), React 19, `osm-api`, `@openstreetmap/id-tagging-schema`, MapLibre GL, Drizzle ORM, Inngest (jobs), Resend (email), Zod

**Storage**: Neon Postgres + PostGIS; object/tile assets on R2 or S3 (Protomaps `.pmtiles`); no MongoDB (geo/watch reconciliation requires PostGIS)

**Testing**: Vitest (unit/contract), Playwright (critical E2E on OSM **dev** API), Drizzle migration checks

**Target Platform**: Web (responsive); Vercel for `apps/web`; worker on Vercel Fluid Compute via Inngest (or a small persistent host later if needed)

**Project Type**: pnpm monorepo — web app + sync worker + shared packages

**Performance Goals**: Claim existing venue happy path under 10 minutes median (SC-002); monitoring cycle for tens of thousands of watch IDs within minutes via ≤725-ID batches; digest send ≤1 email/user/day

**Constraints**: Constitution v1.0.0 (allowlist, human confirmation, no bulk writes, changeset provenance, no prohibited sources); OAuth scopes `write_api` + `read_prefs` only (+ `write_notes` when notes ship); edits only for claimed places/drafts; OSM email for digests with fail-soft; points editable only; polygons read/monitor; no public Nominatim; discovery via Overpass; build against `master.apis.dev.openstreetmap.org` before production; OAuth redirect `127.0.0.1:3000` in local dev

**Scale/Scope**: MVP thousands–tens of thousands watched objects; English SEO matrix `{business type} × {consumer app}`; free single-owner product; chains/billing out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | How plan satisfies |
|------|--------|-------------------|
| I. Allowlisted sources only | PASS | Candidates table separate; `source` enum allowlist in DB; GBP behind flag; no Google Places POI ingest |
| II. Human confirmation before OSM write | PASS | Drafts stay local until publish; autofill never auto-publishes; relink confirm/reject; 409 → three-way merge UI |
| III. No bulk edits outside review queue | PASS | No chain/bulk APIs or UI; one-object publish path only |
| IV. Changeset provenance | PASS | `packages/osm` enforces `created_by`, editable `comment`, allowlisted `source`; user token only |
| V. Prohibited sources never ingested | PASS | Hard deny list in tagging/candidates; imagery blacklist from capabilities |
| OSM API discipline | PASS | Overpass for search; batch version poll for monitor; no `/api/0.6/map` for discovery |
| Auditable OSM packages | PASS | `packages/osm` + `packages/tagging` MIT-oriented, no server in edit path |
| Trademark naming | PASS | Product/domain without “OSM”/“OpenStreetMap” |
| Tagging via id-tagging-schema | PASS | Forms generated from `@openstreetmap/id-tagging-schema` |

**Post-design re-check**: PASS — data-model keeps candidates separate; contracts expose claim-gated edit only; no bulk write endpoints.

## Project Structure

### Documentation (this feature)

```text
specs/001-claim-monitoring/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
mapkeeper/
├── apps/
│   ├── web/                 # Next.js: auth, map, claim, editor, SEO MDX, digests UI
│   └── sync/                # Inngest functions: reconcile, classify, digest, freshness
├── packages/
│   ├── osm/                 # OAuth helpers, API 0.6 client wrappers, changeset policy, XML write
│   ├── db/                  # Drizzle schema, migrations, PostGIS helpers
│   ├── tagging/             # id-tagging-schema → forms, validation, opening_hours builder types
│   └── matching/            # fingerprint, candidate search, relink proposals (no auto-apply)
├── docs/
│   ├── licensing.md         # ODbL conclusion (Week 0)
│   └── osm-community.md     # wiki, contact, DWG notes
├── taginfo.json             # project root; register with taginfo
└── pnpm-workspace.yaml
```

**Structure Decision**: Monorepo matching the product brief — web + sync apps; OSM-touching code in standalone packages for community audit; matching/monitoring stay app/package-private as product moat.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multi-package monorepo vs single Next app | Constitution requires auditable OSM edit path and separate candidate/matching concerns | Single app mixes moat + public audit surface; harder for DWG/community review |
| Dedicated sync app (Inngest) vs only request-time checks | Monitoring digests are the product core and must run periodically | Request-only checks miss changes when owners are offline |
