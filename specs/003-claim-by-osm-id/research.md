# Research: Claim by OSM Object Identity

**Feature**: `003-claim-by-osm-id`  
**Date**: 2026-08-27

## R1 — Two-step look-up vs dry-run claim

**Decision**: Add `GET` (or `POST`) `/api/v1/osm/lookup` that fetches one element from `getOsmApiBase()` and returns a preview DTO. Claim remains `POST /api/v1/businesses/claim` after explicit user action.

**Rationale**: Spec FR-003 requires preview without creating a watch. A dedicated read endpoint keeps side effects clear and matches “Look up” then “Claim / watch” UX.

**Alternatives considered**:
- `POST /claim?preview=1` — mixes read and write semantics; easy to misuse
- Client-side fetch to OSM API — CORS and token handling are worse; editing host may not allow browser CORS

## R2 — Public API fallback on claim

**Decision**:
- **Identity path** (`resolveMode: "editing_host"` or equivalent): call `fetchElement` on `OSM_API_BASE` only. If missing → 422 not found. **Never** call `fetchPublicElement`. **Never** synthesize an element from client-supplied name/lat alone for this mode.
- **Search path** (existing Overpass results): may keep current behavior (editing host first, then public) because Overpass ids belong to the public map and often do not exist on the sandbox.

**Rationale**: FR-007 / SC-003 — sandbox and public id spaces collide numerically (e.g. `relation/4305236658` is sandbox-only). Public fallback would claim the wrong object or invent a watch from client coordinates.

**Alternatives considered**:
- Always editing-host-only for all claims — breaks Overpass → claim on sandbox-configured deploys for live-map venues
- Always public-only — breaks sandbox test data onboarding (this feature’s purpose)

## R3 — Parsing pasted identities and URLs

**Decision**: Implement `parseOsmIdentity(input: string)` in `packages/osm` accepting:
1. Compact `node|way|relation/<positive-int>` (case-insensitive type; optional whitespace)
2. Separate fields already typed in UI (bypass parser)
3. URLs whose **hostname** is in an allowlist:
   - `www.openstreetmap.org`, `openstreetmap.org`
   - `api.openstreetmap.org`
   - `master.apis.dev.openstreetmap.org`, `api06.dev.openstreetmap.org`, `apis.dev.openstreetmap.org`
   - Path patterns: `/node|way|relation/<id>` (ignore hash/query)

Reject unknown hosts and unparseable strings with a validation error (do not attempt look-up).

**Rationale**: Clarification Q5 — parse convenience from public + sandbox aliases; look-up host remains `OSM_API_BASE`.

**Alternatives considered**:
- Only editing-host URLs — frustrates paste from www when testing against sandbox copy of prod data
- Any host with path match — phishing/confusion risk; reject per FR-008 allowlist spirit

## R4 — Location for ways / relations

**Decision**: Preview includes `lat`/`lon` when present on the element (nodes). For ways/relations without coordinates on the JSON element, omit location in preview (still claimable). Do **not** call `/api/0.6/map` or Overpass to center the geometry in v1.

**Rationale**: Spec allows location “when available.” Bulk map extract is constitution-forbidden; Overpass is the wrong database for sandbox objects.

**Alternatives considered**:
- `GET .../full` and average node coords — more accurate but extra requests and edge cases; defer
- Always require node — too narrow for colleague’s relation-heavy sandbox dump

## R5 — Duplicate claim response

**Decision**: When `createClaimedPlace` returns an existing watch, claim API responds **200** (not 201) with `{ alreadyWatched: true, id, ...place, claimNote }` so the UI can navigate to `/places/{id}/edit` or `/places`.

**Rationale**: Clarification Q4 soft success + link; HTTP 201 would imply a new resource.

**Alternatives considered**:
- Always 201 with same body — ambiguous for clients
- 409 Conflict — feels like failure; rejected by product choice A

## R6 — Category default

**Decision**: Identity UI defaults `vertical` to `other`; claim body sends selected vertical. Search-based claim may keep its current default independently.

**Rationale**: Clarification Q3.

## R7 — UI placement

**Decision**: On `/claim`, keep search block primary; below (or under a quieter heading) show “Claim by OpenStreetMap id” with paste field + Look up — always visible, not behind Advanced, not equal visual weight to search.

**Rationale**: Clarification Q2 / FR-001 / FR-009.
