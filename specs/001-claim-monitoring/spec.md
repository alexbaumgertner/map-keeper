# Feature Specification: Claim & Monitoring MVP

**Feature Branch**: `001-claim-monitoring`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Mapkeeper MVP — claim + monitoring for single-location food & hospitality owners on OpenStreetMap; compliance-as-a-service, not a bulk editor."

## Clarifications

### Session 2026-08-21

- Q: Where should Mapkeeper get the email address used for change digests and freshness reminders? → A: Use the email from the OpenStreetMap account if available; fail soft if missing
- Q: When an owner creates a venue that is not yet on the map, when should the first write to OpenStreetMap happen? → A: Keep the new place in Mapkeeper until first explicit publish (after form + diff preview)
- Q: In the MVP, how many places may one signed-in owner watch at the same time? → A: Multiple watches allowed; product still optimized for one primary venue
- Q: Through Mapkeeper’s editor, which places may a signed-in user publish changes for? → A: Only claimed places (and the user’s own drafts)
- Q: For the primary success metric, what share of publishers should return via a monitoring notification and take an action within 90 days? → A: ≥25% within 90 days

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Claim a place and watch it (Priority: P1)

A single-location food or hospitality owner signs in with their existing OpenStreetMap account, finds their venue on the map by name or address (or starts a new point draft in Mapkeeper if it is missing), and claims it. A brand-new venue is not written to OpenStreetMap until the owner completes the editor and explicitly publishes after a diff preview. Claiming only means “I watch this place” inside Mapkeeper; it does not grant ownership rights on the map.

**Why this priority**: Without a watch link there is nothing to monitor. This is the onboarding path and the foundation for every later story.

**Independent Test**: A new user can sign in, locate an existing venue or start a local draft for a missing one, claim/watch it, and see it listed as watched — without publishing to OpenStreetMap or receiving emails yet.

**Acceptance Scenarios**:

1. **Given** a visitor with an OpenStreetMap account, **When** they sign in, **Then** they are authenticated solely via OpenStreetMap and Mapkeeper creates no separate password or local account store for login.
2. **Given** a signed-in owner, **When** they search by name or address and select an existing map object, **Then** they can claim it and it appears in their watched places.
3. **Given** no matching venue on the map, **When** the owner starts a new point place, **Then** they can claim/watch a Mapkeeper draft that has not yet been written to OpenStreetMap.
4. **Given** a claimed place, **When** the owner views what “claim” means, **Then** the product makes clear that the claim is an internal watch link only and confers no exclusivity on OpenStreetMap.
5. **Given** a signed-in owner who already watches one place, **When** they claim another venue, **Then** both appear in their watched list (no hard one-place cap).

---

### User Story 2 - Get notified when a watched place changes (Priority: P2)

After claiming, the owner receives at most one digest email per day when Mapkeeper detects that the watched map object changed: tags edited, moved, deleted, changed object type (e.g. point to area), or conflicting with values the owner previously confirmed. Delivery uses the email address associated with their OpenStreetMap account when available; if no usable OSM email is available, Mapkeeper fails soft (no digest send, clear in-app notice to fix email on OSM) rather than collecting a separate address. The message states what changed, who changed it, and when, with links to the public changeset and to Mapkeeper’s own review view. Tone stays neutral (“your data changed, please review”), not accusatory.

**Why this priority**: Monitoring is the product. Recurring value after the one-time “add” is the central hypothesis and the minimum useful release on its own.

**Independent Test**: With at least one claimed place and a simulated or real third-party change on the map, the owner receives a single daily digest describing the change and can open the review links.

**Acceptance Scenarios**:

1. **Given** a watched place whose map version advanced, **When** the monitoring cycle runs, **Then** Mapkeeper classifies the change (tag edit, relocation, deletion, type change, or conflict with confirmed values) and queues a notification.
2. **Given** multiple changes for the same owner in one day, **When** digests are sent, **Then** the owner receives at most one email that day summarizing them.
3. **Given** a change caused by another mapper, **When** the owner opens the email, **Then** they see who changed it, when, what kind of change, and links to the public changeset and Mapkeeper’s diff view.
4. **Given** a notification, **When** the owner reads the copy, **Then** wording invites review rather than blaming the mapper.
5. **Given** a watched place change but the owner’s OpenStreetMap account has no usable email, **When** digests would send, **Then** Mapkeeper does not invent an alternate address; it skips email delivery and surfaces an in-app notice that email is unavailable.

---

### User Story 3 - Edit and publish place details safely (Priority: P3)

The owner reviews how the map currently represents their **claimed** business (missing or stale fields flagged), then edits through forms derived from the same tagging presets the community’s main point editor uses — deep fields for food & drink and accommodation; a basic set (name, address, phone, website, opening hours) for other types. Opening hours use a visual builder. Only point geometry is editable; areas may be shown and watched but not drawn. Mapkeeper’s editor and publish path are available only for places the user has claimed (including their own unpublished drafts)—not for arbitrary map objects found via search. Before publish, a mandatory diff preview shows what will change. If the map object was updated by someone else since the owner loaded it, a three-way merge lets them resolve each field; the product never blindly overwrites or “last write wins.” Every publish happens under the owner’s own OpenStreetMap identity with required provenance tags.

**Why this priority**: Publishing is how owners fix issues found by monitoring; conflict handling is routine because monitoring and editing coexist.

**Independent Test**: An owner can open a watched point, complete the form with a preview, publish under their OSM identity, and when a concurrent edit exists, resolve conflicts field-by-field without an automatic overwrite.

**Acceptance Scenarios**:

1. **Given** a food/drink or accommodation place, **When** the owner opens the editor, **Then** they see the current map representation with missing/stale fields flagged and forms covering the vertical’s full field set from community tagging presets.
2. **Given** another business type, **When** the owner opens the editor, **Then** they get only the basic fields (name, address, phone, website, opening hours).
3. **Given** the owner is ready to publish, **When** they submit, **Then** they must pass a diff preview showing exactly what will change on the map.
4. **Given** the map object changed since the owner loaded it, **When** they try to publish, **Then** they get a three-way view (what they saw, what is on the map now, what they propose) with per-field resolution — no silent overwrite.
5. **Given** a successful publish, **When** the changeset appears on OpenStreetMap, **Then** it is under the owner’s account and carries Mapkeeper provenance (`created_by`, meaningful user-editable comment, allowlisted `source` — never “Google”).
6. **Given** a polygonal venue, **When** the owner uses the editor, **Then** they can view and monitor it but cannot draw or reshape the area in MVP.
7. **Given** a new venue that does not yet exist on the map, **When** the owner saves progress in Mapkeeper, **Then** nothing is written to OpenStreetMap until they pass diff preview and explicitly publish.
8. **Given** a signed-in user viewing a place they have not claimed, **When** they attempt to use the Mapkeeper editor publish path, **Then** they must claim it first (or are directed to claim); unclaimed places are not editable through Mapkeeper.

---

### User Story 4 - Re-link when the map object “moves” identity (Priority: P4)

When a watched link breaks (object deleted, not found, or type changed such as point absorbed into a building), Mapkeeper proposes nearby candidates using a fingerprint of name, brand, address, phone, and location. The owner confirms or rejects; re-linking never happens automatically.

**Why this priority**: OpenStreetMap has no stable business IDs; unbroken watch links are the moat and the hardest failure mode of monitoring.

**Independent Test**: After a watched object is deleted or replaced by a different object type nearby, the owner sees a “appears to have moved here” proposal and can confirm or reject; rejection leaves the link broken until they act.

**Acceptance Scenarios**:

1. **Given** a broken watch link, **When** matching runs, **Then** the owner is shown candidate matches within a search radius based on the stored fingerprint — not an automatic relink.
2. **Given** a candidate proposal, **When** the owner confirms, **Then** the watch link points at the new map object and monitoring continues.
3. **Given** a candidate proposal, **When** the owner rejects, **Then** no relink occurs and they can keep searching or leave the place unmatched.

---

### User Story 5 - Autofill from allowlisted candidates (Priority: P5)

Mapkeeper may pre-fill the editor from allowlisted sources (owner’s website markup after they confirm the site is theirs; open datasets such as Overture Places above a confidence gate; other allowlisted open data). Each field stays a suggestion until the owner confirms. Nothing is bulk-pushed to the map. Candidate data stays separate from confirmed attributes, and every confirmed attribute records its source.

**Why this priority**: Speeds correct publishing without becoming an import; licence and community procedure depend on human confirmation.

**Independent Test**: With a candidate available for a place, the owner sees pre-filled fields, confirms or edits each, publishes under their account, and attributes remain attributable to specific sources.

**Acceptance Scenarios**:

1. **Given** an allowlisted candidate for a place, **When** the owner opens the editor, **Then** fields may be pre-filled and clearly marked as unconfirmed suggestions.
2. **Given** pre-filled fields, **When** the owner publishes, **Then** only human-confirmed values are written to the map.
3. **Given** confirmed attributes, **When** provenance is inspected, **Then** each attribute has a source, and candidates never mix into the confirmed layer without confirmation.
4. **Given** a prohibited source (e.g. third-party Google Places POIs, scrapers of closed aggregators), **When** any feature is designed or used, **Then** that source cannot supply data.

---

### User Story 6 - Periodic freshness check (Priority: P6)

Every N months (default 6), the owner is reminded to confirm the place is still accurate. One action — “all correct” — records that check (including updating the map’s check-date convention where applicable).

**Why this priority**: Sustains data quality and re-engagement between change events; simple timer is enough for MVP.

**Independent Test**: After the interval elapses for a watched place, the owner receives a reminder and can mark everything correct in one step.

**Acceptance Scenarios**:

1. **Given** a watched place last confirmed longer ago than the interval, **When** reminders run, **Then** the owner is asked to verify accuracy.
2. **Given** a freshness reminder, **When** the owner chooses “all correct,” **Then** the check is recorded and the reminder cycle resets.

---

### User Story 7 - Find Mapkeeper via helpful guides (Priority: P7)

English programmatic landing pages target searches around consumer apps that use OpenStreetMap (e.g. how to appear on Organic Maps / OsmAnd / Komoot), not “add to OpenStreetMap” alone. Each page is a substantive walkthrough with an entry into the product. Language routing is prepared for later locales; MVP content is English only.

**Why this priority**: Acquisition channel; lower than core product loop but in MVP scope as Phase 5.

**Independent Test**: A visitor lands on a guide for a business type × app combination, completes a useful walkthrough, and reaches signup/claim without doorway-spam thin pages.

**Acceptance Scenarios**:

1. **Given** a searcher interested in visibility in a consumer map app, **When** they open a matching landing page, **Then** they get a substantive guide and a clear path into claiming/publishing.
2. **Given** MVP content, **When** pages are published, **Then** they are English-only while the URL/routing structure can accept more languages later.

---

### Edge Cases

- Owner searches and finds multiple similar venues — they must explicitly choose which object to claim.
- Watched object deleted with no good fingerprint match — owner is told the link is broken and guided to search/create, not auto-linked to a weak match.
- Owner and a mapper edit overlapping fields — three-way merge; no silent discard of either side without owner choice.
- OpenStreetMap is read-only or unavailable — monitoring pauses writes gracefully; owner sees a clear failure rather than a fake success.
- Owner is unsure or stuck on a conflict — they can exit via an OpenStreetMap note rather than forcing a bad edit (MVP-capable fallback).
- Claim does not prevent another Mapkeeper user from also watching the same object (no exclusivity); each user still edits only places they personally claimed.
- Rate limits or rejected publishes surface to the owner without retrying in a way that could duplicate or corrupt data.
- OpenStreetMap account has no email (or email is not exposed to Mapkeeper) — change events still record in-app; digests and freshness emails are skipped with a clear notice until OSM email is available.
- New venue draft abandoned before first publish — no OpenStreetMap object is created; the draft may remain or be discarded in Mapkeeper only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users exclusively via OpenStreetMap OAuth; Mapkeeper MUST NOT issue its own passwords or shared bot accounts for editing.
- **FR-002**: Users MUST be able to search for venues by name or address using place-discovery search appropriate for a product (not bulk map downloads meant only for editing tools).
- **FR-003**: Users MUST be able to claim an existing map object or start a new point place as a Mapkeeper draft and claim it as a watched place. A draft that does not yet exist on OpenStreetMap MUST NOT be written to the map until the owner explicitly publishes after form completion and diff preview (FR-009). One account MUST be allowed to watch multiple places; MVP UX SHOULD still optimize for a single primary venue (no chain/bulk management).
- **FR-004**: A claim MUST be stored only as an internal watch relationship and MUST NOT be presented as ownership or exclusivity on OpenStreetMap. A claim MAY exist on a not-yet-published draft.
- **FR-005**: System MUST periodically reconcile watched objects against the live map and detect version/identity changes (tag edits, relocation, deletion, type change, conflict with confirmed values).
- **FR-006**: System MUST notify owners of detected changes with what/who/when, public changeset link, and in-product diff review, at most one digest email per user per day, in neutral tone. Digest and freshness emails MUST use the OpenStreetMap account email when available; if unavailable, the system MUST fail soft (skip send, in-app notice) and MUST NOT require a separate Mapkeeper-collected email for MVP.
- **FR-007**: Users MUST be able to edit point places they have claimed (including their own unpublished drafts) using community tagging presets (full depth for food & drink and accommodation; basic fields otherwise), with a visual opening-hours builder. The Mapkeeper editor MUST NOT offer publish for places the user has not claimed.
- **FR-008**: System MUST show the current map representation (look-then-edit) with missing/stale fields flagged before the edit form.
- **FR-009**: System MUST require a human-readable diff preview before any publish to OpenStreetMap.
- **FR-010**: On concurrent map updates, system MUST present a three-way, per-field merge UI and MUST NOT apply last-write-wins or blind retry.
- **FR-011**: Every Mapkeeper-originated changeset MUST include required provenance (`created_by=Mapkeeper <version>`, user-editable meaningful comment with project wiki link, allowlisted `source` never equal to Google) under the signed-in user’s identity.
- **FR-012**: System MUST NOT draw or reshape polygonal geometry in MVP; polygons MAY be read and monitored.
- **FR-013**: On broken watch links, system MUST propose fingerprint-based candidates and MUST require explicit owner confirm or reject before relinking.
- **FR-014**: System MUST support autofill from the allowlisted sources only (owner entry, owner-confirmed website, gated open datasets such as Overture Places, other recorded ODbL-compatible open data; owner’s own Google Business Profile only behind a flag and never as an MVP dependency).
- **FR-015**: System MUST record `source` per attribute; candidate data MUST remain in a separate unconfirmed layer until human confirmation.
- **FR-016**: System MUST refuse prohibited sources (third-party Google Maps/Places POIs, Apple/Yandex/2GIS/HERE/TomTom outside Overture, TripAdvisor, Yelp, aggregator scraping, Foursquare closed commercial API, blacklisted imagery).
- **FR-017**: System MUST send freshness reminders on a configurable interval (default 6 months) with a one-step “all correct” action, using the same OSM-email delivery rules as FR-006 (fail soft if no usable email).
- **FR-018**: System MUST publish English programmatic SEO guides for `{business type} × {consumer app}` patterns with an embedded product entry point; i18n routing prepared, translations out of MVP.
- **FR-019**: System MUST NOT offer chains, bulk edits, payments/billing, ownership verification, or a native mobile app in MVP.
- **FR-020**: Product name and customer-facing domain MUST NOT contain “OSM” or “OpenStreetMap” (description may say “for OpenStreetMap”).
- **FR-021**: Before public launch, project MUST have a public community contact (response within 24 hours), an Organised Editing wiki project page, and a published machine-readable declaration of tags the tool reads/writes (taginfo registration).

### Key Entities

- **User**: OpenStreetMap identity, notification preferences; no Mapkeeper password. Notification email is the OSM account email when available (not a separately collected Mapkeeper address in MVP).
- **Place link**: Watch binding to a map object (`type`, `id`, `version`) when published, or to a local draft pending first publish; geometry and fingerprint (name/brand/address/phone).
- **Business**: Owner’s venue record in Mapkeeper (vertical, status). Audience is typically single-location, but one user MAY own/watch multiple Business records; no chain/bulk UI in MVP. May exist as a draft before any OpenStreetMap write.
- **Attribute**: Confirmed key/value with mandatory source, optional confidence, confirmer, and confirmation time.
- **Candidate**: Unconfirmed proposal from an allowlisted external or website source; never mixed with confirmed attributes.
- **Change event**: Detected map change (type, diff summary, changeset, author).
- **Notification**: Digest queue item for owner email.
- **Chain** (stub only): Placeholder for post-MVP multi-location; no MVP UI or bulk path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Among users who publish at least one object, at least 25% return via a monitoring notification and take a follow-up action (open review, edit, confirm, or relink) within 90 days of first publish — primary signal that value is monitoring, not one-time add.
- **SC-002**: Median time from first signup to first successful publication is under 10 minutes for the food/hospitality happy path.
- **SC-003**: More than 98% of Mapkeeper-assisted edits are not reverted by the community in the observation window defined at launch.
- **SC-004**: When watch links break, a measurable share are successfully re-matched after owner confirmation (track confirm vs reject vs abandon).
- **SC-005**: SEO landings produce measurable organic visits and a non-zero signup conversion; thin doorway pages are not shipped.
- **SC-006**: Mapper/community complaint volume about Mapkeeper edits stays near zero; a sustained rise is treated as a launch-blocking anti-metric regardless of other numbers.
- **SC-007**: Owners can complete claim of an existing venue without assistance in a single session (task completion on first attempt for the primary path).

## Assumptions

- MVP audience is typically single-location food-service and hospitality owners with working English; the product is free for them. Accounts MAY still watch multiple places; chain-style bulk management remains out of scope.
- Experienced OSM mappers are not a target audience; Mapkeeper does not replace general-purpose editors.
- Google Business Profile import is optional, flagged, and not required for MVP success; access request may proceed in parallel.
- Overture (and similar) confidence thresholds start conservative and are tuned empirically; exact number is an operations default, not a blocker for this spec.
- Reply-to-mapper from inside notifications is deferred past this MVP slice (strong Phase 2 candidate); creating an OSM note as a graceful exit is allowed in MVP.
- Domain/trademark availability for “Mapkeeper” will be verified separately; constitution naming rules still apply.
- ODbL obligations for Mapkeeper’s own database will be recorded in `docs/licensing.md`; they do not change the human-confirmation and allowlist rules above.
- Post-MVP (out of scope here): chains and review-queue bulk edits, payments, ownership verification, minutely replication at planet scale, Payload CMS, verticals beyond deep food/accommodation forms, native mobile apps.
- Community engagement (forum post, DWG conversation) is an organisational prerequisite to launch, not a runtime feature of the app.
- Notification delivery uses the OpenStreetMap account email when available; Mapkeeper does not collect a separate notification email in MVP. If OSM email is missing, digests fail soft with an in-app notice.
- Creating a missing venue starts a Mapkeeper draft only; the first OpenStreetMap write happens on explicit publish after the editor and mandatory diff preview.
- One account may watch multiple places; MVP does not include chain dashboards, bulk edits, or a hard one-place cap.
- Mapkeeper editing/publishing is limited to places the signed-in user has claimed (plus their own drafts); claim is required before edit, not optional for a general map editor.
