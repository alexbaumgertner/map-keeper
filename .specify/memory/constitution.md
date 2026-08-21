<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: (none; first ratification from template placeholders)
  - [PRINCIPLE_1_NAME] → I. Allowlisted Data Sources Only
  - [PRINCIPLE_2_NAME] → II. Human Confirmation Before Any OSM Write
  - [PRINCIPLE_3_NAME] → III. No Bulk Edits Outside a Review Queue
  - [PRINCIPLE_4_NAME] → IV. Mandatory Changeset Provenance
  - [PRINCIPLE_5_NAME] → V. Prohibited Sources Are Never Ingested
- Added sections: OSM Conduct & API Discipline; Identity, Licensing & Product Stance
- Removed sections: (none)
- Follow-up TODOs:
  - Record ODbL derivative/collective-database conclusion in docs/licensing.md
  - Confirm Organised Editing wiki-page requirements with the DWG
-->

# Mapkeeper Constitution

## Core Principles

### I. Allowlisted Data Sources Only
Every attribute written to Mapkeeper storage or proposed for OpenStreetMap
MUST carry a `source` that is on the allowlist. The allowlist is the only
legal origin of data. Anything not listed is off-limits, including "just
this once" scraping, undocumented APIs, and "the owner pasted it from
Google Maps."

**MVP allowlist:**

- The owner, via manual entry in Mapkeeper
- The owner's own business website (`schema.org/LocalBusiness` and equivalent
  markup), after the owner confirms the site is theirs
- Overture Places (CDLA-Permissive 2.0; Foursquare-sourced records under
  Apache 2.0), as unconfirmed candidates only, gated by a confidence
  threshold
- AllThePlaces (CC0 1.0), as unconfirmed candidates only
- Foursquare OS Places open dataset (Apache 2.0), as unconfirmed candidates
  only — never Foursquare's closed commercial API
- Government open data whose licence has been read and recorded as
  ODbL-compatible before use
- Google Business Profile API, and only the owner's own listing after they
  complete OAuth — behind a feature flag, never as an MVP dependency

**Storage rules that enforce this principle:**

- `source` is recorded per attribute, not per object
- Candidate records (Overture, AllThePlaces, website parse, GBP) live in a
  separate layer and MUST NEVER mix with confirmed data
- No value whose source is outside the allowlist MAY exist in the database

Rationale: a single contaminated attribute can make the whole database's
licence status unstatable and can get every related OSM edit reverted.

### II. Human Confirmation Before Any OSM Write
Nothing is ever written to OpenStreetMap without explicit human confirmation
of the specific change. Autofill pre-fills a form; it MUST NOT publish.
Identity re-linking ("your object appears to have moved here") MUST be
confirmed or rejected by the owner; it MUST NEVER happen automatically.
Conflict resolution on a stale version (HTTP 409) MUST present a three-way
merge with per-field human resolution. Blind retry and last-write-wins are
forbidden.

Rationale: a human-confirmed edit is an ordinary OSM edit. A bulk or
unattended push is an Import, with discussion, revert risk, and community
rejection. Mapkeeper sells compliance, not throughput.

### III. No Bulk Edits Outside a Review Queue
The MVP MUST NOT offer bulk, chain-wide, or unattended writes to OSM.
A review queue for chains is a post-MVP feature; until it exists, every
edit is one owner confirming one object. Organised Editing procedures
(wiki page per corporate client as required by the DWG, dedicated review)
MUST be in place before any bulk path ships.

Rationale: RocketData and similar operators were burned by ignoring the
Organised Editing Guidelines and the Automated Edits Code of Conduct.
Bulk without review is the fastest way to get the project ejected.

### IV. Mandatory Changeset Provenance
Every changeset Mapkeeper opens MUST carry:

- `created_by=Mapkeeper <version>`
- `comment` — a meaningful, user-editable description. Mapkeeper MAY
  pre-fill a suggestion and MUST include a link to the project wiki page.
  Mapkeeper MUST NOT auto-generate and lock the comment; the comment tag
  belongs to the user
- `source` — the specific source of the change (`survey`, `owner`,
  `website`, …). The value MUST NEVER be `Google`

Every edit reaches the map under the authenticated OSM user's own account.
Shared or bot accounts are forbidden. Mapkeeper holds no passwords and
issues no accounts of its own. Authentication is exclusively OSM OAuth 2.0.

OAuth scopes requested MUST be `write_api` and `read_prefs` only, plus
`write_notes` or `write_changeset_comments` if and when those features
ship. Mapkeeper MUST NOT request `write_gpx`, `write_diary`, `write_blocks`,
or `write_redactions`.

Rationale: provenance and identity are how the community audits us. A
business tool asking for redaction rights, or writing `source=Google`,
is correctly treated as hostile.

### V. Prohibited Sources Are Never Ingested
The following MUST NEVER be used as a data source, map background, lead
list, or "inspiration" for tags, even if an owner pastes them in and asks
us to apply them as-is from a prohibited product:

- Google Maps / Places API for anyone else's POIs (distinct from the
  owner's own Google Business Profile listing)
- Apple Maps, Yandex Maps, 2GIS, HERE, TomTom outside Overture
- TripAdvisor, Yelp, aggregator scraping
- Foursquare's closed commercial API
- Google (or other blacklisted) imagery tiles — the OSM API capabilities
  response carries an imagery blacklist that MUST be honoured

Using GoogleLocations endpoints for lead generation or competitive
analysis is forbidden. Searching Google for other people's venues in
order to pitch their owners is forbidden.

A violation here means edits get reverted, users' OSM accounts get
blocked, and the project ends.

## OSM Conduct & API Discipline

Mapkeeper is not a bulk OSM editor. It is compliance-as-a-service. The
community MUST be able to audit the edit path.

**API discipline:**

- Discovery and search MUST go through Overpass (or a later self-hosted
  equivalent), never through `/api/0.6/map` or other editing-API bulk
  reads
- The public Nominatim instance MUST NOT be used in the product
- Writes use optimistic locking: updates carry the element's current
  `version`; on HTTP 409 the user resolves fields. Version numbers MUST
  be read back from the server response, never assumed to increment by one
- Destructive and conflict paths MUST be exercised against
  `https://master.apis.dev.openstreetmap.org/` before any production
  changeset is opened
- Local development OAuth MUST use `127.0.0.1:3000`, not `localhost:3000`

**Community obligations (before launch, and ongoing):**

- Repository is public from day one for anything that touches OSM
- OSM-touching packages (OAuth, API 0.6, changeset policy, form-to-tag
  mapping, validation) are auditable in isolation
- An OSM wiki project page exists before launch
- A public contact point for community complaints responds within 24 hours
- A `taginfo.json` is published and registered so the tagging footprint
  is legible
- The product name and domain MUST NOT contain "OSM" or "OpenStreetMap"
  (OSMF trademark policy). "for OpenStreetMap" in a description is fine

**Geometry:** MVP editing is point objects (nodes) only. Polygons MAY be
read and monitored. They MUST NOT be drawn or reshaped in the MVP.

## Identity, Licensing & Product Stance

**Identity resolution is human-gated.** A broken OSM link (404, deletion,
node→way) MAY produce a candidate match from a fingerprint (name / brand /
address / phone plus geometry). Applying that match MUST wait for the
owner. Automatic re-linking is forbidden.

**Licensing:** Overture/ATP/website candidates stay in a candidate layer
until confirmed. The project's own database may be a Derivative or
Collective Database under ODbL; the conclusion MUST be recorded in
`docs/licensing.md` before any public data dump or bulk extract.

**Product stance that specs and plans MUST honour:**

- MVP audience is single-location food-service and hospitality owners.
  The product is free for them. Payments, plans, and billing are out of
  scope
- Experienced OSM mappers are not the audience; Mapkeeper MUST NOT
  compete with or replace iD or JOSM
- Ownership verification is out of scope for the MVP (a claim is an
  internal watch-link, not a right in OSM)
- Tagging models MUST come from `@openstreetmap/id-tagging-schema`.
  Mapkeeper MUST NOT invent a parallel tagging vocabulary
- Vertical depth in the MVP is food & drink and accommodation; other
  types get a basic form only
- Monitoring is the product. Adding a POI is onboarding, not the loop
  that retains users

## Governance

This constitution supersedes feature specs, plans, tasks, and informal
practice. If a spec, plan, or pull request conflicts with a principle
here, the constitution wins and the artifact MUST be amended.

**Amendments:**

1. Propose the change in the pull request or Spec Kit session that needs
   it, with a one-paragraph rationale and the version bump type
2. Update this file (`.specify/memory/constitution.md`) and the
   Sync Impact Report comment at the top
3. Bump version using semver:
   - MAJOR: a principle is removed or redefined incompatibly
   - MINOR: a principle or section is added or materially expanded
   - PATCH: clarification, wording, or non-semantic refinement
4. Set `Last Amended` to the amendment date; do not change `Ratified`

**Compliance review:**

- `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, and
  `/speckit-implement` MUST load this file and reject proposals that
  violate it (prohibited sources, unattended OSM writes, bulk edits,
  invented tagging, trademarked naming, Google imagery)
- Code review of any OSM write path MUST check changeset tags, OAuth
  scopes, human-confirmation gates, and per-attribute `source`
- "It would be easier to scrape X" is not a justification. Ease of
  implementation never overrides Principles I, II, or V

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21
