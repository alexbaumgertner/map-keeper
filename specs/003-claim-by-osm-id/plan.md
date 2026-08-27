# Implementation Plan: Claim by OSM Object Identity

**Branch**: `003-claim-by-osm-id` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-claim-by-osm-id/spec.md`

## Summary

Add a **secondary, always-visible** path on the claim / find-venue flow so signed-in owners can look up an OpenStreetMap object by **type + id** (or pasted `type/id` / public+sandbox OSM URLs), preview it from the **configured editing host only**, then explicitly Claim / watch. Category defaults to **other**. Duplicate watches return soft success with a link to the existing place. Name/address Overpass search stays primary and unchanged. Fix claim resolution so identity claims **never** fall back to the public map API (current `fetchPublicElement` fallback violates FR-007 for this path).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 (Vercel default); Next.js App Router in `apps/web` (workspace Next version)

**Primary Dependencies**: React 19, existing `@mapkeeper/osm` (`fetchElement`, `getOsmApiBase`), iron-session, Zod; Tailwind / current claim UI patterns (UUI not required for this secondary path unless already wrapping `/claim`)

**Storage**: Existing claimed-place model (`createClaimedPlace` / `findClaimedPlace`) — no new tables; soft-duplicate already returns existing row

**Testing**: Vitest for OSM identity parser + look-up/claim route validators; manual / Playwright quickstart against sandbox object ids (e.g. `relation/4305236658`)

**Target Platform**: Web (local `127.0.0.1:3000` + Vercel deploy); OSM sandbox editing host for validation

**Project Type**: pnpm monorepo — `packages/osm` (parse + strict read) + `apps/web` (API + claim UI)

**Performance Goals**: Look-up preview under a few seconds (single OSM API 0.6 element fetch); claim under 2 minutes end-to-end (SC-001)

**Constraints**: Constitution v1.0.0 — no `/api/0.6/map` bulk extract; no Overpass for this path; no OSM write on claim; no public Nominatim; editing-host-only resolve for identity; claim = watch link only

**Scale/Scope**: One secondary UI block on `/claim`, one look-up API, claim API mode/flag for editing-host-only + already-watched response shape; parser helpers in `@mapkeeper/osm`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | How plan satisfies |
|------|--------|-------------------|
| I. Allowlisted sources only | PASS | Object metadata comes only from OSM editing-host API read; no aggregator scrape |
| II. Human confirmation before OSM write | PASS | Claim creates watch only; no changeset |
| III. No bulk edits outside review queue | PASS | Single object look-up/claim; no changeset bulk import |
| IV. Changeset provenance | PASS (N/A writes) | No changeset opened |
| V. Prohibited sources never ingested | PASS | No Google/tiles/aggregators; tiles remain public basemap (display only) |
| OSM API discipline | PASS | Identity path uses single-element `api/0.6/{type}/{id}` via existing `fetchElement` — **not** `/api/0.6/map`; Overpass remains for name search only |
| Auditable OSM packages | PASS | Parser + read helpers in `packages/osm` |
| Trademark naming | PASS | UI copy may say “OpenStreetMap object” in description; product name unchanged |
| Tagging via id-tagging-schema | PASS (N/A) | No tag forms in this feature; vertical is Mapkeeper category only |

**Post-design re-check**: PASS — [research.md](./research.md) forbids public-id fallback on identity claim; [contracts/api.md](./contracts/api.md) defines editing-host-only look-up; [data-model.md](./data-model.md) reuses watch link without new write paths.

## Project Structure

### Documentation (this feature)

```text
specs/003-claim-by-osm-id/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
mapkeeper/
├── packages/osm/
│   ├── src/identity.ts          # NEW: parse type/id + OSM object URLs
│   ├── src/read.ts              # unchanged fetchElement; callers stop using public fallback for identity
│   └── src/index.ts             # export identity helpers
├── apps/web/
│   ├── src/app/(app)/claim/page.tsx
│   │   # secondary identity block: input, Look up, preview, vertical, Claim / watch
│   ├── src/app/api/v1/osm/lookup/route.ts   # NEW GET/POST look-up (auth required)
│   ├── src/app/api/v1/businesses/claim/route.ts
│   │   # editingHostOnly (or source=identity): no fetchPublicElement; alreadyWatched response
│   └── src/lib/places/store.ts  # already returns existing; surface flag in API
└── packages/osm/ (tests)
    └── src/identity.test.ts     # NEW Vitest
```

**Structure Decision**: Keep monorepo; put parse/URL allowlist in `packages/osm` for reuse and auditability; add a dedicated look-up route so preview never creates a watch; tighten claim route for identity claims only (search-based claim may keep public fallback for Overpass ids — see research).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate look-up endpoint + claim | Spec requires two-step preview without creating a watch | Single claim POST cannot show preview-before-watch without inventing a dry-run flag that still confuses clients |
| Dual claim resolve modes (identity vs search) | Overpass ids live on public map; sandbox ids live on editing host | One resolve policy would either break live Overpass claims or allow wrong-id sandbox→public fallback |
