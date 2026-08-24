# Implementation Plan: Map UI from Figma (UUI)

**Branch**: `002-uui-map-ui` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-uui-map-ui/spec.md`

## Summary

Replace the marketing-style home and sparse “new place” draft UI with the Figma **Map Watcher** two-pane screens (start + Add Business), built with **EPAM UUI Loveship** controls over the existing MapLibre map and OSM OAuth session. Extend draft create/update APIs so incomplete drafts auto-save on close (including optional external page URL stored only, never scraped), and wire auth so signed-out Add Business returns to the form after OAuth. Geographic map search uses an allowlisted geocoder proxy (Photon), not public Nominatim.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 24 (Vercel default); Next.js App Router in `apps/web` (current tree uses Next 15.x — stay on workspace version unless a separate upgrade task ships)

**Primary Dependencies**: React 19, EPAM UUI (`@epam/uui-core`, `@epam/uui-components`, `@epam/uui`, `@epam/loveship`), MapLibre GL, existing `@mapkeeper/db` / `@mapkeeper/osm`, iron-session, Zod; Tailwind remains for layout shells until screens are UUI-first

**Storage**: Neon Postgres via Drizzle (`businesses`, `place_links`, `attributes`); memory store path unchanged for local-without-DB; new optional attribute keys for proper name, business type, external page URL

**Testing**: Manual quickstart checklist + Playwright happy paths (start chrome, Add Business pin → Next, OAuth redirect return); Vitest for draft/update validators and “no fetch on external URL”

**Target Platform**: Web desktop-primary (≈1280×832 mockups); Vercel Fluid Compute / Node for API routes

**Project Type**: pnpm monorepo — work confined to `apps/web` (+ small `packages/db` schema/query extensions)

**Performance Goals**: Add Business → Next under 2 minutes (SC-002); UI interactions feel immediate (map pan/zoom, pin placement); geocode search responds within a few seconds or fails soft

**Constraints**: Constitution v1.0.0 — no aggregator scrape; no OSM write from this flow; no public Nominatim; OSM OAuth only; Map Watcher visible title; UUI Loveship required for these screens’ controls

**Scale/Scope**: Three Figma frames + signed-in chrome + draft autosave/resume; claim/discover of existing OSM objects, editor/diff/publish redesign out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | How plan satisfies |
|------|--------|-------------------|
| I. Allowlisted sources only | PASS | External page URL stored as owner-entered string on draft; never fetched/scraped into attributes as aggregator data |
| II. Human confirmation before OSM write | PASS | Next / close only touch local drafts; publish remains later editor path |
| III. No bulk edits outside review queue | PASS | Single-place draft UI only |
| IV. Changeset provenance | PASS (N/A writes) | No changeset opened by this feature |
| V. Prohibited sources never ingested | PASS | FR-011: no Booking/Airbnb/auto-fill; copy may mention aggregators as paste examples only |
| OSM API discipline | PASS | Venue discovery remains Overpass; map place search uses Photon (not public Nominatim); no `/api/0.6/map` |
| Auditable OSM packages | PASS | No new server-side OSM write path |
| Trademark naming | PASS | User-facing title **Map Watcher** (no “OSM”/“OpenStreetMap” in product name) |
| Tagging via id-tagging-schema | PASS | Add Business uses curated Housing/Food type list; full preset forms stay in existing editor after Next |

**Post-design re-check**: PASS — [data-model.md](./data-model.md) stores URL as plain attribute without fetch; [contracts/api.md](./contracts/api.md) has no scrape endpoint; geocode contract is Photon proxy only.

## Project Structure

### Documentation (this feature)

```text
specs/002-uui-map-ui/
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
├── apps/web/
│   ├── package.json                 # add @epam/uui* + @epam/loveship
│   ├── src/app/
│   │   ├── layout.tsx               # UUI CSS + uui-theme-loveship on body
│   │   ├── page.tsx                 # Start Screen (Map Watcher home + map)
│   │   ├── (app)/places/new/        # Add Business (UUI form + map) or relocate under /add
│   │   └── api/v1/
│   │       ├── auth/osm/start|callback  # redirect=/places/new (or /add)
│   │       ├── businesses/              # extend POST + PATCH incomplete draft
│   │       ├── businesses/[id]/
│   │       ├── geo/search/              # NEW Photon geocode proxy
│   │       └── discover/search/         # unchanged Overpass venue search
│   ├── src/components/
│   │   ├── map/MapView.tsx          # full-bleed, pin, custom zoom/locate chrome
│   │   ├── shell/StartHomePanel.tsx
│   │   ├── shell/AddBusinessPanel.tsx
│   │   └── uui/                     # thin wrappers / providers if needed
│   └── src/lib/places/store.ts      # incomplete draft create/update/resume
└── packages/db/
    ├── src/schema/index.ts          # optional: no enum change if attributes suffice
    └── src/queries.ts               # insert/update draft with optional lat/lon + attrs
```

**Structure Decision**: Keep monorepo; implement UI in `apps/web` only; extend `packages/db` queries for incomplete drafts and attribute keys. Do not redesign claim/editor packages in this feature.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Add EPAM UUI alongside existing Tailwind | Stakeholder Figma is UUI/Loveship; visual acceptance requires design-system components | Restyling Tailwind alone will fail SC-001 parity with UUI mockups |
| New `/api/v1/geo/search` | Spec needs country/region/city/coords search; public Nominatim forbidden | Reusing Overpass venue search needs a center point and is not a geocoder |
