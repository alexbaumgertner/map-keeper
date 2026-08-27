---
description: "Task list for Claim by OSM Object Identity"
---

# Tasks: Claim by OSM Object Identity

**Input**: Design documents from `/specs/003-claim-by-osm-id/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Plan calls for Vitest on the identity parser and claim/lookup validators — include those unit tests. End-to-end validation via `quickstart.md` in Polish.

**Organization**: Tasks grouped by user story. Paths follow monorepo layout in `plan.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US3) for story phases only
- Include exact file paths in descriptions

## Path Conventions

- App: `apps/web/`
- OSM package: `packages/osm/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm package export surface and feature wiring points (no new dependencies)

- [x] T001 Confirm `@mapkeeper/osm` package export entry points in `packages/osm/src/index.ts` and `packages/osm/package.json` so new `identity` module can be exported
- [x] T002 [P] Skim existing claim UI and claim route for touch points in `apps/web/src/app/(app)/claim/page.tsx` and `apps/web/src/app/api/v1/businesses/claim/route.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared parse helper + editing-host resolve mode — MUST complete before story UI/API work

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [x] T003 Implement `parseOsmIdentity` (compact `type/id` + allowlisted OSM object URL hosts per research R3) in `packages/osm/src/identity.ts`
- [x] T004 [P] Export identity helpers from `packages/osm/src/index.ts`
- [x] T005 [P] Add Vitest unit tests for `parseOsmIdentity` (valid compact, public/sandbox URLs, reject unknown host / bad id) in `packages/osm/src/identity.test.ts`
- [x] T006 Extend `POST /api/v1/businesses/claim` with `resolveMode: "editing_host" | "default"` — editing_host uses `fetchElement` only (no `fetchPublicElement`, no client synthesize) in `apps/web/src/app/api/v1/businesses/claim/route.ts`
- [x] T007 Return **200** + `alreadyWatched: true` when `createClaimedPlace` finds an existing watch; keep **201** for new claims in `apps/web/src/app/api/v1/businesses/claim/route.ts`

**Checkpoint**: Parser tests pass; claim with `resolveMode=editing_host` fails closed on missing sandbox-only-miss / wrong public fallback; duplicate claim soft-succeeds

---

## Phase 3: User Story 1 — Claim by type and id (Priority: P1) 🎯 MVP

**Goal**: Signed-in owner looks up type+id on editing host, previews, chooses category (default other), then Claim / watch

**Independent Test**: With sandbox `OSM_API_BASE`, look up `relation/4305236658` (or known sandbox id), preview without watch, claim with vertical other, see place on `/places` — no Overpass, no OSM write

### Implementation for User Story 1

- [x] T008 [US1] Add `GET /api/v1/osm/lookup` (auth required; `osmType`+`osmId` and/or `q`; editing-host `fetchElement` only; 422 not found) per `contracts/api.md` in `apps/web/src/app/api/v1/osm/lookup/route.ts`
- [x] T009 [US1] Add secondary “Claim by map object id” section (always visible, quieter than search) with type+id or single identity field, Look up button, loading/error states in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T010 [US1] Render look-up preview card (displayName or type/id, location when present) without creating a watch in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T011 [US1] Add vertical select defaulting to **other** (food_drink / accommodation / other) on preview in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T012 [US1] Wire Claim / watch to `POST /api/v1/businesses/claim` with `resolveMode: "editing_host"` + selected vertical; show claim note; require sign-in like search in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T013 [US1] Handle already-watched **200** with message + link/navigate to existing place (`/places/{id}/edit` or `/places`) in `apps/web/src/app/(app)/claim/page.tsx`

**Checkpoint**: US1 quickstart scenarios 1 and 4 (claim + already watched) work without paste-URL polish

---

## Phase 4: User Story 2 — Paste compact identity or OSM URL (Priority: P2)

**Goal**: Paste `relation/4305236658` or public/sandbox OSM object URL → same look-up preview path

**Independent Test**: Paste allowlisted URL or `type/id` → Look up → same preview as typed fields; unknown host / garbage string → validation error, no network claim

### Implementation for User Story 2

- [x] T014 [US2] Accept `q` on look-up route via `parseOsmIdentity` (typed fields win if both provided) in `apps/web/src/app/api/v1/osm/lookup/route.ts`
- [x] T015 [US2] Prefer single paste field on claim page that sends `q` to look-up; keep clear parse-error message (no Claim) in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T016 [P] [US2] Extend `packages/osm/src/identity.test.ts` with www + api06 + master.apis.dev URL fixtures and rejection of non-allowlisted hosts

**Checkpoint**: US2 quickstart scenario 2 passes

---

## Phase 5: User Story 3 — Fail clearly when missing / no public fallback (Priority: P3)

**Goal**: Missing editing-host object never claims a public-map id twin; invalid input rejected before claim

**Independent Test**: Look up absent id → not found, Claim disabled, no `/places` row; confirm identity claim never hits `fetchPublicElement`

### Implementation for User Story 3

- [x] T017 [US3] Ensure look-up and editing_host claim return clear 422 copy for not-found / invalid type-id in `apps/web/src/app/api/v1/osm/lookup/route.ts` and `apps/web/src/app/api/v1/businesses/claim/route.ts`
- [x] T018 [US3] Disable or hide Claim / watch when preview is absent or look-up failed; surface editing-host unavailable (502) as retryable in `apps/web/src/app/(app)/claim/page.tsx`
- [x] T019 [P] [US3] Add focused Vitest or route-level test asserting `resolveMode=editing_host` does not call public fallback (mock `fetchElement` / `fetchPublicElement`) under `apps/web/` or `packages/osm/` per existing test layout
- [x] T020 [US3] Confirm search-based claim path still uses default resolve (editing then public) so Overpass claims do not regress in `apps/web/src/app/(app)/claim/page.tsx` (omit `resolveMode` or send `default`)

**Checkpoint**: US3 quickstart scenarios 3 and 5 (missing + search regression)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs and end-to-end validation

- [x] T021 [P] Note identity claim path / `resolveMode` in `README.md` (brief) if env/docs section mentions claim
- [x] T022 Run full `specs/003-claim-by-osm-id/quickstart.md` against local or Vercel with sandbox `OSM_API_BASE` and record results in `specs/003-claim-by-osm-id/quickstart-results.md`
- [x] T023 [P] Verify name-search UI copy still primary and identity section remains secondary styling in `apps/web/src/app/(app)/claim/page.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: After Setup — **BLOCKS** all user stories
- **US1 (Phase 3)**: After Foundational — MVP
- **US2 (Phase 4)**: After US1 look-up UI exists (extends paste on same page/route)
- **US3 (Phase 5)**: After Foundational claim mode; ideally after US1 UI for full UX, but API fail-closed can be verified earlier
- **Polish (Phase 6)**: After desired stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on T003–T007 only
- **US2 (P2)**: Depends on US1 look-up route + claim page section (T008–T012)
- **US3 (P3)**: Depends on T006 resolve mode; UI polish depends on US1 preview states

### Parallel Opportunities

- T004 ∥ T005 after T003
- T014 work can start on route while T015 UI paste field proceeds after T009 exists
- T016 ∥ T019 test tasks
- T021 ∥ T023 during polish

---

## Parallel Example: Foundational

```bash
# After T003 identity.ts exists:
Task: "Export identity helpers from packages/osm/src/index.ts"
Task: "Add Vitest unit tests in packages/osm/src/identity.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add test that editing_host claim never calls fetchPublicElement"
Task: "Keep search claim on default resolveMode in claim/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup  
2. Phase 2 Foundational (parser + resolveMode + alreadyWatched)  
3. Phase 3 US1 (look-up API + secondary UI + claim)  
4. **STOP** — validate quickstart scenario 1 with sandbox id  
5. Deploy/demo  

### Incremental Delivery

1. MVP (US1) → sandbox claim by typed id  
2. US2 → paste URL / compact string  
3. US3 → harden fail-closed + search regression  
4. Polish → quickstart-results.md  

### Suggested MVP scope

**US1 only** (T001–T013): enough to claim colleague sandbox data by type+id.

---

## Notes

- Do **not** introduce `/api/0.6/map` or Overpass on the identity path
- Search claim must not send `resolveMode: "editing_host"`
- Claim creates watch only — no OSM changeset
- [P] = different files / no incomplete-task dependency
