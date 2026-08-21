---
description: "Task list for Claim & Monitoring MVP implementation"
---

# Tasks: Claim & Monitoring MVP

**Input**: Design documents from `/specs/001-claim-monitoring/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested in the feature specification — no dedicated TDD tasks. Validate via `quickstart.md` scenarios in Polish.

**Organization**: Tasks grouped by user story for independent delivery. Paths follow the monorepo in `plan.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US7) for story phases only
- Include exact file paths in descriptions

## Path Conventions

- Apps: `apps/web/`, `apps/sync/`
- Packages: `packages/osm/`, `packages/db/`, `packages/tagging/`, `packages/matching/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo skeleton and tooling

- [x] T001 Create pnpm workspace root with `pnpm-workspace.yaml`, root `package.json`, and `.nvmrc` (Node 24) at repository root
- [x] T002 Scaffold Next.js 16 App Router TypeScript app in `apps/web/` with `127.0.0.1:3000` noted in `apps/web/README.md`
- [x] T003 [P] Scaffold sync worker package in `apps/sync/` with Inngest entrypoint stub `apps/sync/src/inngest/client.ts`
- [x] T004 [P] Scaffold packages `packages/osm/`, `packages/db/`, `packages/tagging/`, `packages/matching/` with `package.json` and `tsconfig.json` each
- [x] T005 [P] Configure shared ESLint/Prettier and TypeScript project references in `package.json` and `tsconfig.base.json`
- [x] T006 [P] Add root `.env.example` documenting Neon, OSM OAuth (dev API), Overpass, Resend, and tile URL vars
- [x] T007 [P] Create placeholder `docs/licensing.md` and `docs/osm-community.md` with TODOs from constitution

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth, database, OSM client shell, map shell, API layout — MUST complete before user stories

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [x] T008 Implement Drizzle + PostGIS connection and migration runner in `packages/db/src/client.ts` and `packages/db/drizzle.config.ts`
- [x] T009 Create core schema tables `users`, `businesses`, `place_links`, `chains` (stub) in `packages/db/src/schema/` per `data-model.md`
- [x] T010 [P] Add allowlisted `attribute_source` enum and CHECK constraints in `packages/db/src/schema/enums.ts` (forbid `google`)
- [x] T011 [P] Implement OSM OAuth 2.0 helpers (scopes `write_api` + `read_prefs`) targeting `master.apis.dev.openstreetmap.org` in `packages/osm/src/oauth.ts`
- [x] T012 [P] Implement OSM capabilities fetch + imagery blacklist check in `packages/osm/src/capabilities.ts`
- [x] T013 [P] Implement JSON element read helpers (batch nodes/ways/relations, single element) in `packages/osm/src/read.ts`
- [x] T014 Wire auth routes `apps/web/src/app/api/v1/auth/osm/start/route.ts`, `callback/route.ts`, `me/route.ts`, `logout/route.ts` per `contracts/api.md`
- [x] T015 Implement session store binding OSM user → `users` row including cached `osm_email` / `email_usable` in `apps/web/src/lib/auth/session.ts`
- [x] T016 [P] Add Zod API error helpers (`401`/`403`/`422`/`503`) in `apps/web/src/lib/api/errors.ts`
- [x] T017 [P] Add MapLibre map shell with non-blacklisted basemap (Protomaps placeholder) in `apps/web/src/components/map/MapView.tsx`
- [x] T018 [P] Add Overpass discovery client (no `/api/0.6/map`) in `packages/osm/src/overpass.ts`
- [x] T019 Create app shell layout with sign-in CTA and claim disclaimer copy in `apps/web/src/app/(app)/layout.tsx`
- [x] T020 Configure Inngest client and empty serve route in `apps/sync/src/inngest/client.ts` and `apps/web/src/app/api/inngest/route.ts`

**Checkpoint**: Foundation ready — OSM sign-in works on `127.0.0.1:3000`; DB migrates; map renders

---

## Phase 3: User Story 1 — Claim a place and watch it (Priority: P1) 🎯 MVP

**Goal**: Sign in, discover or draft a venue, claim/watch it (multi-watch allowed); no OSM write for drafts

**Independent Test**: New user signs in on OSM dev, claims existing place and/or starts draft, sees watched list; draft has no OSM changeset

### Implementation for User Story 1

- [x] T021 [P] [US1] Extend `place_links` draft fields (`osm_id` nullable, status enum) in `packages/db/src/schema/place-links.ts`
- [x] T022 [P] [US1] Implement fingerprint builder (name/brand/address/phone) in `packages/matching/src/fingerprint.ts`
- [x] T023 [US1] Implement `GET /api/v1/discover/search` proxying Overpass in `apps/web/src/app/api/v1/discover/search/route.ts`
- [x] T024 [US1] Implement `GET/POST /api/v1/businesses` and `POST /api/v1/businesses/claim` in `apps/web/src/app/api/v1/businesses/`
- [x] T025 [US1] Implement `GET /api/v1/businesses/[id]` owner-scoped in `apps/web/src/app/api/v1/businesses/[id]/route.ts`
- [x] T026 [US1] Build claim/search UI (map + results + claim CTA + watch-only disclaimer) in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T027 [US1] Build watched-places list (multi-watch) in `apps/web/src/app/(app)/places/page.tsx`
- [x] T028 [US1] Build “create missing place” draft flow (local only, no OSM write) in `apps/web/src/app/(app)/places/new/page.tsx`
- [x] T029 [US1] Snapshot OSM version + geometry + fingerprint on claim in `apps/web/src/lib/places/claim.ts`

**Checkpoint**: US1 independently demoable (quickstart V1–V2)

---

## Phase 4: User Story 2 — Get notified when a watched place changes (Priority: P2)

**Goal**: Reconcile watched OSM versions, classify changes, ≤1 digest email/UTC day; fail soft without OSM email

**Independent Test**: External edit on OSM dev → ChangeEvent → digest or `skipped_no_email` + in-app notice

### Implementation for User Story 2

- [x] T030 [P] [US2] Add `change_events` and `notifications` tables in `packages/db/src/schema/change-events.ts` and `notifications.ts`
- [x] T031 [P] [US2] Implement `ChangeSource` polling interface and OSM batch version fetcher in `apps/sync/src/monitoring/change-source.ts`
- [x] T032 [US2] Implement reconcile job batching ≤725 IDs in `apps/sync/src/inngest/functions/reconcile.ts`
- [x] T033 [US2] Implement change classifier (tag/relocation/deletion/type_change/confirmed_conflict) in `apps/sync/src/monitoring/classify.ts`
- [x] T034 [US2] Implement daily digest aggregator (unique per user/UTC day) in `apps/sync/src/inngest/functions/digest.ts`
- [x] T035 [US2] Implement Resend email sender with neutral copy templates in `apps/sync/src/email/digest.ts`
- [x] T036 [US2] Skip send when `email_usable=false` and write `skipped_no_email` + in-app notice in `apps/sync/src/email/delivery.ts`
- [x] T037 [US2] Implement `GET /api/v1/notifications` and `GET /api/v1/businesses/[id]/changes` in `apps/web/src/app/api/v1/`
- [x] T038 [US2] Build notifications inbox + change review links UI in `apps/web/src/app/(app)/notifications/page.tsx`
- [x] T039 [US2] Build in-product diff view for a ChangeEvent in `apps/web/src/app/(app)/places/[id]/changes/[eventId]/page.tsx`

**Checkpoint**: US2 works with claimed places from US1 (quickstart V5)

---

## Phase 5: User Story 3 — Edit and publish place details safely (Priority: P3)

**Goal**: Claim-gated look-then-edit, id-tagging-schema forms, opening_hours builder, diff preview, client OSM publish, 409 three-way merge

**Independent Test**: Publish claimed draft/node to OSM dev with provenance tags; concurrent edit triggers merge UI; unclaimed place returns 403

### Implementation for User Story 3

- [x] T040 [P] [US3] Add `attributes` table and confirmation helpers in `packages/db/src/schema/attributes.ts`
- [x] T041 [P] [US3] Generate form schemas from `@openstreetmap/id-tagging-schema` (food_drink, accommodation, basic) in `packages/tagging/src/presets.ts`
- [x] T042 [P] [US3] Implement tag length validation (≤255 codepoints) and opening_hours builder types in `packages/tagging/src/validate.ts` and `opening-hours.ts`
- [x] T043 [P] [US3] Implement changeset create/upload/close + OsmChange XML writer with provenance enforcement in `packages/osm/src/publish.ts`
- [x] T044 [US3] Implement three-way merge helpers (base/remote/local per field) in `packages/osm/src/merge.ts`
- [x] T045 [US3] Implement claim-gated `GET .../editor-state`, `POST .../attributes/confirm`, `POST .../publish-recorded` in `apps/web/src/app/api/v1/businesses/[id]/`
- [x] T046 [US3] Build look-then-edit summary UI (missing/stale flags) in `apps/web/src/components/editor/PlaceSummary.tsx`
- [x] T047 [US3] Build vertical-aware editor form + opening_hours builder in `apps/web/src/components/editor/PlaceForm.tsx`
- [x] T048 [US3] Build mandatory diff preview step in `apps/web/src/components/editor/DiffPreview.tsx`
- [x] T049 [US3] Build three-way merge UI for HTTP 409 in `apps/web/src/components/editor/ConflictMerge.tsx`
- [x] T050 [US3] Wire browser publish flow (token from session, no server bot write) in `apps/web/src/lib/osm/client-publish.ts`
- [x] T051 [US3] Enforce polygons read-only (no draw tools) in `apps/web/src/components/map/MapView.tsx` and editor entry `apps/web/src/app/(app)/places/[id]/edit/page.tsx`
- [x] T052 [US3] Add OSM Notes draft helper + client post path stub in `packages/osm/src/notes.ts` and `apps/web/src/components/editor/NotesFallback.tsx`

**Checkpoint**: US3 independently testable (quickstart V3–V4, V8)

---

## Phase 6: User Story 4 — Re-link when map object identity breaks (Priority: P4)

**Goal**: On broken links, propose fingerprint matches; human confirm/reject only

**Independent Test**: Delete/replace watched object on OSM dev → proposals → reject keeps broken → confirm reactivates

### Implementation for User Story 4

- [x] T053 [P] [US4] Add `relink_proposals` table in `packages/db/src/schema/relink-proposals.ts`
- [x] T054 [P] [US4] Implement radius candidate search + scoring in `packages/matching/src/search.ts` and `score.ts`
- [x] T055 [US4] Emit `matching/propose-relink` from reconcile when status becomes broken in `apps/sync/src/inngest/functions/propose-relink.ts`
- [x] T056 [US4] Implement relink list/confirm/reject API routes in `apps/web/src/app/api/v1/businesses/[id]/relink-proposals/`
- [x] T057 [US4] Build relink UI (“appears to have moved here”) in `apps/web/src/app/(app)/places/[id]/relink/page.tsx`
- [x] T058 [US4] On confirm, update `place_links` osm identity/version and set status `active` in `apps/web/src/lib/places/relink.ts`

**Checkpoint**: US4 independently testable (quickstart V6)

---

## Phase 7: User Story 5 — Autofill from allowlisted candidates (Priority: P5)

**Goal**: Website + Overture candidates in separate layer; confirm into attributes; never bulk-push OSM

**Independent Test**: Candidates stored unconfirmed; confirm then publish; prohibited source rejected

### Implementation for User Story 5

- [x] T059 [P] [US5] Add `candidates` table and repository helpers in `packages/db/src/schema/candidates.ts`
- [x] T060 [P] [US5] Implement website schema.org LocalBusiness parser in `packages/tagging/src/website-parse.ts`
- [x] T061 [P] [US5] Implement Overture Places fetch + confidence gate (default 0.8) in `apps/web/src/lib/candidates/overture.ts`
- [x] T062 [US5] Implement `POST .../candidates/website`, `refresh-overture`, reject routes in `apps/web/src/app/api/v1/businesses/[id]/candidates/`
- [x] T063 [US5] Surface candidates as pre-filled unconfirmed fields in `apps/web/src/components/editor/CandidateFields.tsx`
- [x] T064 [US5] Hard-deny prohibited sources module (Google Places POIs, etc.) in `packages/tagging/src/allowlist.ts`
- [x] T065 [US5] Feature-flag stub for GBP (disabled by default) in `apps/web/src/lib/candidates/gbp-flag.ts`

**Checkpoint**: US5 independently testable (quickstart V7)

---

## Phase 8: User Story 6 — Periodic freshness check (Priority: P6)

**Goal**: Every N months (default 180 days) remind owner; one-click “all correct”

**Independent Test**: Due business gets freshness notification; confirm resets timer (and optionally queues check_date edit)

### Implementation for User Story 6

- [x] T066 [P] [US6] Implement freshness scan Inngest function in `apps/sync/src/inngest/functions/freshness.ts`
- [x] T067 [US6] Implement `POST /api/v1/businesses/[id]/freshness/confirm` in `apps/web/src/app/api/v1/businesses/[id]/freshness/confirm/route.ts`
- [x] T068 [US6] Build freshness reminder UI/CTA in `apps/web/src/components/places/FreshnessBanner.tsx`
- [x] T069 [US6] Reuse email fail-soft path for freshness kind in `apps/sync/src/email/freshness.ts`

**Checkpoint**: US6 independently testable

---

## Phase 9: User Story 7 — Find Mapkeeper via helpful guides (Priority: P7)

**Goal**: English programmatic landings `{business type} × {app}` with product CTA; i18n routing ready

**Independent Test**: Open one guide URL → substantive walkthrough → claim entry point

### Implementation for User Story 7

- [x] T070 [P] [US7] Add i18n-ready `[locale]` segment defaulting to `en` in `apps/web/src/app/[locale]/layout.tsx`
- [x] T071 [P] [US7] Create MDX guide content model and sample pages under `apps/web/content/guides/`
- [x] T072 [US7] Implement guide route `apps/web/src/app/[locale]/guides/[app]/[businessType]/page.tsx`
- [x] T073 [US7] Embed claim/signup CTA component in `apps/web/src/components/seo/GuideCta.tsx`
- [x] T074 [US7] Add sitemap/robots for guide matrix in `apps/web/src/app/sitemap.ts` and `apps/web/src/app/robots.ts`

**Checkpoint**: US7 independently testable (quickstart V9)

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Compliance artifacts and validation across stories

- [x] T075 [P] Author root `taginfo.json` declaring tags read/written by Mapkeeper
- [x] T076 [P] Expand `docs/licensing.md` with ODbL derivative/collective conclusion draft
- [x] T077 [P] Expand `docs/osm-community.md` with wiki page outline, public contact, DWG checklist
- [x] T078 Add README root with OSM OAuth `127.0.0.1` + OSM **dev** API requirements in `README.md`
- [x] T079 Ensure capabilities readonly pauses worker writes in `apps/sync/src/monitoring/guardrails.ts`
- [x] T080 Run `specs/001-claim-monitoring/quickstart.md` scenarios V1–V9 on OSM dev and record results in `specs/001-claim-monitoring/quickstart-results.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately
- **Phase 2 (Foundational)**: Depends on Setup — **BLOCKS** all user stories
- **Phases 3–9 (US1–US7)**: Depend on Foundational; preferred order P1→P7; US2+ need claimed places (US1); US3–US5 benefit from US1; US4 needs monitoring break detection (US2) or can stub broken status; US6 needs notifications infra (US2); US7 can proceed after Foundational in parallel
- **Phase 10 (Polish)**: After desired stories complete

### User Story Dependencies

| Story | Depends on | Independently testable after |
|-------|------------|------------------------------|
| US1 Claim | Foundation | Foundation + US1 |
| US2 Monitoring | Foundation + at least one active place_link (US1) | US1 + US2 |
| US3 Editor | Foundation + claim/draft (US1) | US1 + US3 |
| US4 Relink | Foundation + place_link; ideally US2 detect broken | US1 + US4 (can force broken) |
| US5 Autofill | Foundation + editor confirm path (US3 attrs) | US1 + US3 + US5 |
| US6 Freshness | Foundation + notification delivery (US2) | US1 + US2 + US6 |
| US7 SEO | Foundation | Foundation + US7 |

### Parallel Opportunities

- Phase 1: T003–T007 in parallel after T001–T002
- Phase 2: T010–T013, T016–T018 in parallel after T008–T009 started
- After Foundation: US7 can run parallel with US1; US3 packages (`tagging`, `publish`) parallel with US2 monitoring once US1 exists
- Within stories: tasks marked [P] are parallelizable

### Within Each User Story

- Schema before services/routes
- Routes before UI (or UI against mocked API if parallelized carefully)
- No OSM write before diff preview (US3)
- Never auto-relink (US4)

---

## Parallel Example: User Story 1

```bash
# After Foundation, in parallel:
Task: "T021 Extend place_links draft fields in packages/db/src/schema/place-links.ts"
Task: "T022 Implement fingerprint builder in packages/matching/src/fingerprint.ts"

# Then sequential API → UI:
Task: "T023 Discover search route"
Task: "T024 Businesses + claim routes"
Task: "T026–T028 Claim/list/draft UI"
```

## Parallel Example: User Story 3

```bash
Task: "T040 attributes schema"
Task: "T041–T042 tagging presets + validation"
Task: "T043–T044 osm publish + merge"
# Then wire API + UI
```

---

## Implementation Strategy

### MVP First (minimum shippable product loop)

Per original sequence: **US1 → US2** is the minimum useful release (claim + monitoring). Then US3 publish.

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1 — stop and validate (V1–V2)
4. Phase 4 US2 — stop and validate (V5) — **first valuable ship**
5. Phase 5 US3 — publish path
6. Continue US4→US7 as capacity allows

### Incremental Delivery

Each story adds value without requiring later stories. Do not start chains/billing/GBP (flag only).

### Suggested MVP scope

**US1 + US2** for first external demo; add **US3** before any production OSM writes beyond claim snapshots.

---

## Notes

- Constitution: no bulk writes, no prohibited sources, human confirmation, changeset provenance enforced in `packages/osm`
- Client-side OSM writes only; server records via `publish-recorded`
- Commit after each task or logical group
- Stop at checkpoints to validate independently
- Format: all tasks use `- [x] Txxx ...` with file paths; story tasks include `[USn]`
