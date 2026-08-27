# Feature Specification: Claim by OSM Object Identity

**Feature Branch**: `003-claim-by-osm-id`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Claim venue by OSM object identity — secondary claim path using type + numeric id resolved from the configured OpenStreetMap editing host (sandbox/dev for testing), so test data and non-indexed objects can be watched without Overpass name search."

## Clarifications

### Session 2026-08-27

- Q: After the owner enters a type and id, must Mapkeeper show a resolved preview and wait for an explicit claim action, or may a single submit resolve and claim in one step? → A: Two steps — look up / preview first, then owner clicks Claim / watch
- Q: How prominent should the claim-by-identity path be on the claim / find-venue screen? → A: Always visible, clearly secondary to name/address search
- Q: When claiming by identity, how should the owner set the business category (food & drink, accommodation, or other)? → A: Default to other; owner may change before claim
- Q: If the owner already watches the same type and id, what should happen when they try to claim it again via identity? → A: Soft success — keep existing watch, message already watched, link/navigate to that place
- Q: When the owner pastes an OpenStreetMap object URL, which site addresses should Mapkeeper accept for extracting type and id? → A: Public OSM + known sandbox/dev aliases; resolve only on the configured editing host

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Claim a known map object by type and id (Priority: P1)

A signed-in owner (or tester) already knows the OpenStreetMap identity of a venue — object type (node, way, or relation) and numeric id — for example from a sandbox changeset page. On the claim / find-venue flow they choose the “claim by identity” path, enter type and id (or paste a short type/id string), and run look-up. Mapkeeper shows a preview of the object found on the editing host; only after the owner explicitly clicks Claim / watch is the place claimed. Claiming still means only “watch this place” inside Mapkeeper; nothing is written to OpenStreetMap.

**Why this priority**: Without this path, sandbox and other editing-host-only objects cannot be onboarded at all while name search depends on the public discovery index.

**Independent Test**: With a known object that exists on the configured editing host (and preferably does not exist on the public map), a signed-in user can claim it via type + id and see it in their watched places — without using name/address search.

**Acceptance Scenarios**:

1. **Given** a signed-in owner on the claim flow, **When** they look up a valid object type and id that exists on the editing host, **Then** Mapkeeper shows a preview (display name if present, type/id, and location when available) without creating a watch yet, and only creates the watch after they click Claim / watch.
2. **Given** a successful look-up preview, **When** the owner claims without changing category, **Then** the watched place is stored with category **other**; they may select food & drink or accommodation before claim instead.
3. **Given** a successful identity claim, **When** the owner views their places, **Then** the watched place appears with the same claim semantics as a search-based claim (watch link only; no exclusivity on OpenStreetMap).
4. **Given** an identity claim, **When** claim completes, **Then** no OpenStreetMap write occurs (claim does not publish or create map data).
5. **Given** a visitor who is not signed in, **When** they try to use claim-by-identity, **Then** they are required to sign in before claiming (same rule as search-based claim).

---

### User Story 2 - Paste a compact identity or OSM URL (Priority: P2)

The owner pastes a compact identity such as `relation/4305236658` or a standard OpenStreetMap object URL from the editing host into the identity field. Mapkeeper parses type and id, runs the same look-up preview, and only claims after an explicit Claim / watch click.

**Why this priority**: Testers and mappers commonly copy links from changeset or object pages; reducing typing errors makes the path usable in real workflows.

**Independent Test**: Pasting a supported type/id string or object URL resolves to the same confirmation and claim outcome as entering type and id separately.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they paste `node|way|relation/<positive-integer>` (with `/` or optional whitespace), **Then** Mapkeeper accepts it as type + id.
2. **Given** a signed-in owner, **When** they paste a recognizable OpenStreetMap object URL from the public site or a known sandbox/dev alias that contains type and id, **Then** Mapkeeper extracts type and id and continues to look-up on the configured editing host (URL host does not change which database is queried).
3. **Given** input that cannot be parsed as type + id, **When** they submit, **Then** they see a clear validation message and no claim is created.

---

### User Story 3 - Fail clearly when the object is missing or ambiguous (Priority: P3)

If the object does not exist on the configured editing host, or the id is invalid, the owner sees a clear failure and Mapkeeper does not silently claim a different object from the public map that happens to share the same numeric id.

**Why this priority**: Sandbox and public map id spaces differ; a silent fallback would attach the wrong venue and break trust in testing and production.

**Independent Test**: Claiming a type/id that is absent on the editing host fails with an understandable message and creates no watched place; no public-map substitute is claimed.

**Acceptance Scenarios**:

1. **Given** a type/id that does not exist on the editing host, **When** the owner runs look-up, **Then** Mapkeeper reports that the object was not found on the configured map host, does not offer Claim / watch, and does not create a watch.
2. **Given** an invalid id (non-positive, non-numeric, empty) or unsupported type, **When** the owner submits, **Then** Mapkeeper rejects the input before attempting a claim.
3. **Given** an object that exists only on the editing host (same numeric id absent or different on the public map), **When** claim-by-identity succeeds, **Then** the watched place is bound to the editing-host object the owner confirmed — not to a public-map object chosen by id coincidence.

---

### Edge Cases

- What happens when the object exists but has no `name` tag? Confirmation still shows type/id and location when available; claim is allowed.
- What happens when the object is a way or relation without a usable center/point? Claim is still allowed if identity resolves; location may be omitted or approximate if the product already supports that for search claims.
- What happens when the owner already watches this type/id? Mapkeeper does not create a duplicate watch; it reports that the place is already watched and offers a clear path (link or navigation) to the existing watched place.
- What happens when the editing host is temporarily unavailable? The owner sees a temporary failure and can retry; no partial claim is stored.
- What happens when the pasted URL is from www.openstreetmap.org or a sandbox alias but the deployment editing host differs? Type/id are parsed from the URL; look-up still hits only the configured editing host — missing there fails clearly (no public-id fallback).
- How does this interact with name search? Name/address search remains the primary, more prominent path and is unchanged; identity claim is always visible on the same flow but clearly secondary (not equal weight, not hidden behind an “Advanced” disclosure).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The claim / find-venue flow MUST offer a secondary path to claim by OpenStreetMap object type (node, way, or relation) and numeric id, in addition to existing name/address search. The identity path MUST be always visible on that flow and clearly secondary to name/address search (search remains the primary, more prominent path).
- **FR-002**: Object resolution for this path MUST use the same configured OpenStreetMap editing host that Mapkeeper uses for sign-in and map writes — not the public discovery index used for name search.
- **FR-003**: Identity claim MUST be two steps: (1) look-up resolves and previews the object (display name when present, type/id, location when available) without creating a watch; (2) an explicit Claim / watch action creates the watch. Look-up failure MUST NOT create a watch.
- **FR-004**: Claim-by-identity MUST reuse existing claim semantics: internal watch link only; no ownership or exclusivity language; no OpenStreetMap write on claim.
- **FR-005**: Claim-by-identity MUST require an authenticated OpenStreetMap session (same gate as search-based claim).
- **FR-006**: Mapkeeper MUST reject invalid type/id input with a clear validation message and MUST NOT create a watch.
- **FR-007**: When the object is not found on the editing host, Mapkeeper MUST fail clearly and MUST NOT fall back to claiming a public-map object solely because the numeric id matches.
- **FR-008**: Mapkeeper MUST accept pasted compact identities of the form `type/id` and recognizable OpenStreetMap object URLs from the public OSM site and known sandbox/dev host aliases that encode type and id. Parsed type/id MUST still be resolved only on the configured editing host; accepting a URL MUST NOT imply look-up on that URL’s host.
- **FR-009**: Existing name/address discovery and claim behavior MUST remain available, unchanged, and primary for owners finding venues on the live indexed map; identity claim MUST NOT replace or visually compete equally with search.
- **FR-010**: If the owner already watches the same type/id, Mapkeeper MUST not create a second watch; MUST treat the action as a soft success with an “already watched” message; and MUST provide a clear path (link or navigation) to the existing watched place.
- **FR-011**: On the identity-claim preview, business category MUST default to **other**; the owner MUST be able to change it to food & drink or accommodation before Claim / watch.

### Key Entities

- **Map object identity**: OpenStreetMap type (node, way, relation) plus numeric id; the stable handle the owner uses to claim.
- **Editing host**: The OpenStreetMap API host configured for this Mapkeeper deployment (sandbox for testing, public API only when intentionally configured for production).
- **Watched place (claim)**: Existing Mapkeeper watch link binding an owner to a map object identity; unchanged meaning from prior claim features.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in tester who knows a sandbox object id from a sandbox changeset can claim that object on the claim flow in under 2 minutes without using name search.
- **SC-002**: Objects that exist only on the editing host can be claimed successfully when the deployment points at that host.
- **SC-003**: Attempts to claim a type/id missing on the editing host fail with a clear message 100% of the time in acceptance tests, and never create a watch bound to a different public-map object with the same numeric id.
- **SC-004**: At least 90% of first-time testers in a guided walkthrough complete identity claim successfully on the first try when given a valid type/id.
- **SC-005**: Name/address search claim continues to work for live-map venues with no regression in the primary discovery path.

## Assumptions

- The editing host is already configured per deployment (sandbox for local/staging; public map only when intentionally set for production).
- Existing claim persistence and “watch link only” product language remain the source of truth; this feature adds an entry path, not a new claim model.
- Preferring the editing host for identity resolution (and refusing public-map id fallback) is required so sandbox and public id spaces cannot be confused.
- Supporting paste of `type/id` and common OSM object URLs (public + known sandbox/dev aliases) is in scope for v1; exotic or short-link formats can be rejected with validation. Look-up always uses the configured editing host.
- Basemap tiles and name search may continue to reflect the public map; this feature does not require sandbox tiles or a sandbox discovery index.
- Bulk claiming of an entire changeset remains out of scope.
- Identity-claim category defaults to **other** (not inferred from tags in v1); the owner can override before claim.
