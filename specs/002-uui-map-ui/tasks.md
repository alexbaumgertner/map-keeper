---
description: "Task list for Map UI from Figma (UUI) implementation"
---

# Tasks: Map UI from Figma (UUI)

**Input**: Design documents from `/specs/002-uui-map-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested in the feature specification — no dedicated TDD tasks. Validate via `quickstart.md` in Polish.

**Organization**: Tasks grouped by user story for independent delivery. Paths follow the monorepo in `plan.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US4) for story phases only
- Include exact file paths in descriptions

## Path Conventions

- App: `apps/web/`
- Package: `packages/db/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: EPAM UUI Loveship + UI folder layout for Map Watcher screens

- [ ] T001 Add EPAM UUI packages `@epam/uui-core`, `@epam/uui-components`, `@epam/uui`, `@epam/loveship` (matched versions) to `apps/web/package.json` and install via workspace
- [ ] T002 Import UUI/Loveship styles and set `uui-theme-loveship` on `<body>` in `apps/web/src/app/layout.tsx` (and/or `apps/web/src/app/globals.css` as needed)
- [ ] T003 [P] Create UI shell folders `apps/web/src/components/shell/` and `apps/web/src/components/uui/` per `plan.md`
- [ ] T004 [P] Add curated Housing/Food business-type option lists in `apps/web/src/lib/places/business-types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Map shell API, incomplete-draft persistence, auth redirects — MUST complete before user stories

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [ ] T005 Extend MapLibre `MapView` for full-bleed layout, map click → lng/lat callback, single movable pin marker, and optional hide of default NavigationControl in `apps/web/src/components/map/MapView.tsx`
- [ ] T006 [P] Extend `insertDraftPlace` / watched-place types for optional `lat`/`lon`, `properName`, `businessType`, `externalPageUrl`, and incomplete drafts in `packages/db/src/queries.ts` (and exports in `packages/db/src/index.ts`)
- [ ] T007 [P] Extend memory + DB draft helpers for incomplete create/update and attribute keys (`name`, `business_type`, `external_page_url`, source `owner` only) in `apps/web/src/lib/places/store.ts`
- [ ] T008 Extend `POST /api/v1/businesses` for incomplete vs `complete=true` Zod body per `contracts/api.md` in `apps/web/src/app/api/v1/businesses/route.ts`
- [ ] T009 Implement `PATCH /api/v1/businesses/[id]` for owned draft updates (same fields as POST) in `apps/web/src/app/api/v1/businesses/[id]/route.ts`
- [ ] T010 [P] Confirm OAuth start accepts `redirect=/places/new` and document usage in `apps/web/src/app/api/v1/auth/osm/start/route.ts` (callback already restores path in `apps/web/src/app/api/v1/auth/osm/callback/route.ts`)

**Checkpoint**: Draft POST/PATCH accept partial payloads; MapView supports pin + click; OAuth can return to `/places/new`

---

## Phase 3: User Story 1 — Land on the start screen and orient (Priority: P1) 🎯 MVP

**Goal**: Map Watcher two-pane start screen with Add Business, Sign Up/Login or identity+Log out, map chrome placeholders

**Independent Test**: Open `/` signed out — title **Map Watcher**, Add Business, helper copy, Sign Up/Login, map with search field + zoom/locate controls; signed in — identity + Log out; Add Business while signed out starts OSM auth with return to Add Business

### Implementation for User Story 1

- [ ] T011 [P] [US1] Build `StartHomePanel` (title Map Watcher, Add Business accent + multi-map copy, auth row) with UUI Loveship in `apps/web/src/components/shell/StartHomePanel.tsx`
- [ ] T012 [P] [US1] Build map overlay chrome (search TextInput shell + zoom/locate IconButtons) in `apps/web/src/components/shell/MapChrome.tsx`
- [ ] T013 [US1] Replace marketing landing with two-pane Start Screen composing panel + MapView + MapChrome in `apps/web/src/app/page.tsx`
- [ ] T014 [US1] Wire signed-out Sign Up/Login and Add Business to `/api/v1/auth/osm/start?redirect=…` and signed-in state via `/api/v1/auth/me` + logout in `apps/web/src/app/page.tsx` / `StartHomePanel.tsx`
- [ ] T015 [US1] Ensure signed-out Add Business uses `redirect=/places/new` so callback returns to Add Business per FR-014 in `apps/web/src/components/shell/StartHomePanel.tsx`

**Checkpoint**: US1 demoable against Figma `15:2375` and quickstart scenarios 1–3 (auth return may land on stub `/places/new` until US2)

---

## Phase 4: User Story 2 — Start adding a business (location not yet set) (Priority: P1)

**Goal**: Add Business form (Housing/Food, names, type, location prompt, optional URL, disabled Next, close autosave)

**Independent Test**: Signed-in user opens `/places/new` — form matches Figma empty state; Next disabled without pin; close with typed data creates/resumes incomplete draft; no OSM write

### Implementation for User Story 2

- [ ] T016 [P] [US2] Build `AddBusinessPanel` (title, close, Housing/Food tabs, full name, proper name, business type, location prompt, external URL, Next disabled) with UUI in `apps/web/src/components/shell/AddBusinessPanel.tsx`
- [ ] T017 [US2] Rewrite Add Business page as two-pane shell (panel + map) without requiring pin yet in `apps/web/src/app/(app)/places/new/page.tsx`
- [ ] T018 [US2] Implement dirty close → incomplete `POST`/`PATCH` then navigate home; empty close without write in `apps/web/src/app/(app)/places/new/page.tsx`
- [ ] T019 [US2] Prefill form from `?draft=<id>` via `GET /api/v1/businesses/[id]` for resume in `apps/web/src/app/(app)/places/new/page.tsx`
- [ ] T020 [US2] Map Housing→`accommodation` and Food→`food_drink`; refresh type options from `apps/web/src/lib/places/business-types.ts` in `AddBusinessPanel.tsx`

**Checkpoint**: US2 independently demoable (Figma `3:2`); quickstart scenario 4

---

## Phase 5: User Story 3 — Place the business on the map and continue (Priority: P1)

**Goal**: Map click sets pin + coordinates; Next enables and creates complete local draft; optional URL stored without fetch

**Independent Test**: Fill required fields, click map, Next accent-enabled → local draft → editor route; URL saved; no OSM changeset; no HTTP fetch to pasted URL

### Implementation for User Story 3

- [ ] T021 [US3] Wire map click / pin move to Location coordinates display and form state in `apps/web/src/app/(app)/places/new/page.tsx` and `MapView.tsx`
- [ ] T022 [US3] Enable Next only when full name, proper name, business type, and lat/lon present; accent styling via UUI in `apps/web/src/components/shell/AddBusinessPanel.tsx`
- [ ] T023 [US3] On Next, `POST`/`PATCH` with `complete=true` (store `externalPageUrl` if set, never fetch) then navigate to `/places/[id]/edit` in `apps/web/src/app/(app)/places/new/page.tsx`
- [ ] T024 [US3] Assert no scraper/fetch path exists for `externalPageUrl` (keep store/API write-only) in `apps/web/src/lib/places/store.ts` and `apps/web/src/app/api/v1/businesses/route.ts`

**Checkpoint**: US3 independently demoable (Figma `13:215`); quickstart scenario 5

---

## Phase 6: User Story 4 — Search and navigate the map while adding (Priority: P2)

**Goal**: Map search (city/region/coords), zoom, and locate work on start and Add Business without leaving two-pane layout

**Independent Test**: From start or Add Business, search flies map; zoom/locate update viewport; failures show non-blocking message; no Nominatim in network log

### Implementation for User Story 4

- [ ] T025 [P] [US4] Implement Photon + coordinate-parse geocode helper in `apps/web/src/lib/geo/photon.ts` (or `packages/osm` if preferred for reuse)
- [ ] T026 [US4] Add `GET /api/v1/geo/search` route per `contracts/api.md` in `apps/web/src/app/api/v1/geo/search/route.ts`
- [ ] T027 [US4] Wire MapChrome search to geo API and `flyTo` on MapView in `apps/web/src/components/shell/MapChrome.tsx` and `apps/web/src/components/map/MapView.tsx`
- [ ] T028 [US4] Wire zoom in/out and browser geolocation (locate) with soft error messaging in `apps/web/src/components/shell/MapChrome.tsx` and `MapView.tsx`
- [ ] T029 [US4] Reuse MapChrome on both Start (`apps/web/src/app/page.tsx`) and Add Business (`apps/web/src/app/(app)/places/new/page.tsx`)

**Checkpoint**: US4 independently demoable; quickstart scenario 6

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Visual parity, responsive best-effort, validation pass

- [ ] T030 [P] Tune spacing/typography to Figma density on Start and Add Business panels in `apps/web/src/components/shell/StartHomePanel.tsx` and `AddBusinessPanel.tsx`
- [ ] T031 [P] Best-effort narrow viewport stacking (panel above map) without breaking pin placement in `apps/web/src/app/page.tsx` and `apps/web/src/app/(app)/places/new/page.tsx`
- [ ] T032 Run through `specs/002-uui-map-ui/quickstart.md` scenarios 1–6 and fix gaps
- [ ] T033 [P] Confirm network tab: no public Nominatim; no fetch to Booking/Airbnb URLs on Next/close in a manual check noted in `specs/002-uui-map-ui/quickstart-results.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **US1–US4 (Phases 3–6)**: Depend on Foundational; prefer P1 order US1 → US2 → US3, then US4
- **Polish (Phase 7)**: After desired stories complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on other stories (Add Business link may hit stub until US2)
- **US2 (P1)**: After Foundational — uses draft APIs; benefits from US1 navigation but testable via direct `/places/new`
- **US3 (P1)**: Depends on US2 form shell (same page) — implement after US2 on `places/new`
- **US4 (P2)**: After Foundational — can parallelize with US1 visually; integrate MapChrome after T012 exists

### Within Each User Story

- Components before page wiring
- API/helpers before UI that calls them (US4)
- Complete story checkpoint before next priority when solo

### Parallel Opportunities

- T003–T004 (Setup) in parallel after T001–T002
- T006–T007–T010 in parallel during Foundational (after/with T005/T008 sequencing as noted)
- T011–T012 in parallel (US1)
- T016 parallelizable with page work once Foundational done
- T025 parallel with earlier stories; T026 after T025
- T030–T031–T033 in parallel during Polish

---

## Parallel Example: User Story 1

```bash
# After Foundational checkpoint:
Task: "Build StartHomePanel in apps/web/src/components/shell/StartHomePanel.tsx"
Task: "Build MapChrome in apps/web/src/components/shell/MapChrome.tsx"
# Then sequentially wire page.tsx (T013–T015)
```

## Parallel Example: User Story 4

```bash
Task: "Implement Photon helper in apps/web/src/lib/geo/photon.ts"
# Then:
Task: "Add GET /api/v1/geo/search in apps/web/src/app/api/v1/geo/search/route.ts"
Task: "Wire search + zoom/locate in MapChrome.tsx / MapView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (UUI)
2. Complete Phase 2: Foundational (map + drafts + auth redirect)
3. Complete Phase 3: US1 Start Screen
4. **STOP and VALIDATE** against Figma `15:2375` / quickstart 1–2
5. Demo home chrome before Add Business depth

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 Start Screen → demo MVP chrome
3. US2 Add Business empty form + autosave → demo Figma `3:2`
4. US3 Pin + Next → demo Figma `13:215` + editor handoff
5. US4 Geo search / zoom / locate → full map chrome
6. Polish → quickstart 1–6

### Parallel Team Strategy

1. Together: Setup + Foundational
2. Then: Dev A → US1; Dev B → US2/US3 (same page — prefer one owner); Dev C → US4 geocode API + MapChrome wiring

---

## Notes

- [P] = different files, no dependency on incomplete sibling tasks
- Visible product title is **Map Watcher** (not Mapkeeper) on these screens
- Never scrape `external_page_url`; never use public Nominatim
- No OSM writes from Add Business Next/close
- Commit after each task or logical group
- Suggested MVP scope: **US1 only** after Foundational; product-complete P1 path is US1+US2+US3
