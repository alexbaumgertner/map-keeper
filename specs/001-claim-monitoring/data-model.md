# Data Model: Claim & Monitoring MVP

**Feature**: `001-claim-monitoring` | **Date**: 2026-08-21  
**Storage**: Neon Postgres + PostGIS (see [research.md](./research.md))

## Entity Relationship (overview)

```text
users 1──* businesses 1──1 place_links
                │              │
                ├──* attributes (confirmed)
                ├──* candidates (unconfirmed)
                └──* change_events
users 1──* notifications
chains (stub) ── optional FK from businesses later
```

## Enumerations

### `attribute_source` (allowlist — DB CHECK / enum)

`owner` | `survey` | `website` | `overture` | `alltheplaces` | `foursquare_os` | `government` | `gbp` | `local_knowledge`

- `google` MUST NOT be a valid value
- Application layer rejects any value outside this set

### `business_status`

`draft` | `published` | `unlinked` | `archived`

### `place_link_status`

`draft` | `active` | `broken` | `pending_relink`

### `change_type`

`tag_edit` | `relocation` | `deletion` | `type_change` | `confirmed_conflict`

### `notification_kind`

`change_digest` | `freshness` | `email_unavailable`

### `notification_status`

`queued` | `sent` | `skipped_no_email` | `failed`

### `vertical`

`food_drink` | `accommodation` | `other`

---

## Entities

### User

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | Mapkeeper id |
| osm_user_id | bigint UNIQUE | OSM identity |
| osm_display_name | text | |
| osm_email | text NULL | Cached from OSM when available; may be null |
| email_usable | boolean | False when digests must fail soft |
| oauth_token_ref | text/encrypted | Refresh/access handling; never used for server-side bulk writes |
| notification_prefs | jsonb | digest on/off, freshness on/off |
| created_at / updated_at | timestamptz | |

**Validation**: No password fields. Auth is OSM OAuth only.

**Rules**: If `osm_email` null/empty → `email_usable = false`; digests set `skipped_no_email`.

---

### Business

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| owner_user_id | uuid FK → users | |
| vertical | vertical | |
| status | business_status | draft until first OSM publish |
| display_name | text | |
| chain_id | uuid NULL FK → chains | stub only |
| last_freshness_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

**Rules**: One user may own many businesses (no hard cap). No chain/bulk UI in MVP.

**Transitions**: `draft` → `published` on first successful OSM create; `published` → `unlinked` when place_link broken; `*` → `archived` on user delete/abandon.

---

### PlaceLink

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| business_id | uuid UNIQUE FK | |
| osm_type | text NULL | `node` \| `way` \| `relation`; null while draft |
| osm_id | bigint NULL | null while draft |
| osm_version | int NULL | SoT for “have we seen this change?” |
| geom | geography(Point,4326) NULL | centroid for ways |
| fingerprint | jsonb | `{name, brand, address, phone}` normalized |
| status | place_link_status | |
| last_seen_at | timestamptz NULL | |
| created_at / updated_at | timestamptz | |

**Indexes**: `(osm_type, osm_id)` unique where not null; GiST on `geom`; GIN/trigram on fingerprint fields as needed.

**Rules**:
- Draft: `osm_id` null, status `draft` — no OSM write yet
- Active monitoring requires `status = active` and non-null osm identity
- Relink updates osm_* only after owner confirm
- Multiple users may have place_links to the same `(osm_type, osm_id)` (no exclusivity)

---

### Attribute (confirmed)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| key | text | OSM tag key |
| value | text | ≤255 Unicode codepoints (OSM limit) |
| source | attribute_source | **mandatory** |
| confidence | numeric NULL | from candidate if applicable |
| confirmed_by_user_id | uuid FK | |
| confirmed_at | timestamptz | |
| created_at / updated_at | timestamptz | |

**Rules**: Unique `(business_id, key)`. Never insert without allowlisted `source`. Never copy from candidates without confirmation event.

---

### Candidate (unconfirmed layer)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| source | attribute_source | subset: website, overture, … |
| external_id | text NULL | e.g. Overture id |
| payload | jsonb | proposed tags / fields |
| confidence | numeric NULL | gate ≥ 0.8 default for overture |
| status | text | `proposed` \| `accepted` \| `rejected` \| `expired` |
| created_at / updated_at | timestamptz | |

**Rules**: MUST NOT be mixed into `attributes` until human accept. Licence boundary: candidate layer is separate for ODbL accounting.

---

### ChangeEvent

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| place_link_id | uuid FK | |
| business_id | uuid FK | |
| change_type | change_type | |
| from_version / to_version | int NULL | |
| changeset_id | bigint NULL | |
| author_osm_user | text NULL | |
| diff_summary | jsonb | field-level summary |
| detected_at | timestamptz | |
| notified_in | uuid NULL FK → notifications | |

---

### Notification

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| kind | notification_kind | |
| status | notification_status | |
| payload | jsonb | change_event ids, links |
| digest_day | date | UTC date for uniqueness |
| sent_at | timestamptz NULL | |
| created_at | timestamptz | |

**Rules**: Unique `(user_id, kind=change_digest, digest_day)` for at-most-one digest/day. Skip send → `skipped_no_email` when `email_usable` false; still create in-app notice records as needed.

---

### RelinkProposal

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| place_link_id | uuid FK | |
| candidate_osm_type | text | |
| candidate_osm_id | bigint | |
| score | numeric | |
| evidence | jsonb | |
| status | `pending` \| `confirmed` \| `rejected` | |
| created_at / resolved_at | timestamptz | |

**Rules**: Confirm → update PlaceLink; Reject → leave broken; never auto-apply.

---

### Chain (stub)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| brand_wikidata | text NULL | |
| nsi_id | text NULL | |
| name | text | |

No MVP UI or bulk edit paths.

---

## Invariants (must hold in app + DB)

1. Nothing is written to OSM without an explicit user publish action after diff preview.
2. `attributes.source` is NOT NULL and ∈ allowlist; `google` impossible.
3. `place_links.osm_version` is the reconciliation cursor for active links.
4. Candidates never appear in confirmed attribute queries without a confirmation join/event.
5. Mapkeeper editor/publish APIs authorize only `businesses.owner_user_id = session.user`.
6. Tag values validated to ≤255 Unicode codepoints before OSM upload.

## State diagrams (compact)

**Business**: `draft --publish--> published --link broken--> unlinked --relink confirm--> published`

**PlaceLink**: `draft --first publish--> active --detect break--> broken --proposal--> pending_relink --confirm--> active | --reject--> broken`
