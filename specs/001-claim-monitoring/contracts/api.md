# API Contracts: Claim & Monitoring MVP

Base URL (web app): `/api/v1`  
Auth: Session from OSM OAuth 2.0 (`Authorization` session cookie).  
Unless noted, all endpoints require authentication.

OSM **writes** (changeset create/upload/close, element create/update) happen in the **browser** via `packages/osm` using the user’s token. The server records outcomes and never bulk-writes with a shared bot account.

---

## Auth

### `GET /api/v1/auth/osm/start`

Starts OSM OAuth. Query: `redirect` (optional path).

### `GET /api/v1/auth/osm/callback`

OAuth callback. Establishes session; refreshes cached `osm_email` / `email_usable`.

### `GET /api/v1/auth/me`

**200** — current user profile + `email_usable`, watched business count.

### `POST /api/v1/auth/logout`

**204**

---

## Discovery (server proxies Overpass; no `/api/0.6/map`)

### `GET /api/v1/discover/search`

Query: `q` (name/address text), `lat`, `lon`, `radius_m` (optional), `limit` (default 20).

**200**:
```json
{
  "results": [
    {
      "osmType": "node",
      "osmId": 123,
      "name": "Example Cafe",
      "lat": 0,
      "lon": 0,
      "tags": { "amenity": "cafe" }
    }
  ]
}
```

---

## Businesses & claims

### `GET /api/v1/businesses`

List businesses owned by the current user (multi-watch allowed).

### `POST /api/v1/businesses`

Create draft business + draft place link (no OSM write).

Body:
```json
{
  "vertical": "food_drink",
  "displayName": "Example Cafe",
  "lat": 51.5,
  "lon": -0.1
}
```

**201** — business with `status: "draft"`.

### `POST /api/v1/businesses/claim`

Claim an existing OSM object (creates business + active place link). No exclusivity.

Body:
```json
{
  "osmType": "node",
  "osmId": 123,
  "vertical": "food_drink"
}
```

**201** — claimed business. Snapshots version + fingerprint from live OSM read.

### `GET /api/v1/businesses/{id}`

Owner only. Includes place link, attributes, open change events, pending relink proposals.

### `PATCH /api/v1/businesses/{id}`

Owner only. Update vertical/display metadata (not OSM tags).

---

## Editor support (claim-gated)

### `GET /api/v1/businesses/{id}/editor-state`

Owner only. Returns look-then-edit payload: current OSM tags (if published), confirmed attributes, candidates, missing/stale flags, form schema id for vertical.

**403** if not owner / not claimed by session user.

### `POST /api/v1/businesses/{id}/attributes/confirm`

Confirm candidate or manual fields into `attributes` (still no OSM write until client publish).

Body:
```json
{
  "fields": [
    { "key": "opening_hours", "value": "Mo-Fr 09:00-17:00", "source": "owner" }
  ]
}
```

### `POST /api/v1/businesses/{id}/publish-recorded`

Called **after** successful client-side OSM upload to record versions, clear draft, store changeset id.

Body:
```json
{
  "osmType": "node",
  "osmId": 123,
  "osmVersion": 4,
  "changesetId": 999,
  "tagsWritten": { "name": "Example Cafe" }
}
```

**409** path is client-only (three-way merge); server is not asked to force-write.

---

## Candidates (autofill)

### `POST /api/v1/businesses/{id}/candidates/website`

Body: `{ "url": "https://…" }` — owner confirms site is theirs; parse schema.org into candidates.

### `POST /api/v1/businesses/{id}/candidates/refresh-overture`

Fetch/store Overture candidates above confidence gate (default 0.8). Never writes OSM.

### `POST /api/v1/businesses/{id}/candidates/{candidateId}/reject`

---

## Monitoring & notifications

### `GET /api/v1/notifications`

In-app list (includes `skipped_no_email` notices).

### `GET /api/v1/businesses/{id}/changes`

Change events for a watched place.

### `POST /api/v1/businesses/{id}/freshness/confirm`

“All correct” — updates `last_freshness_at`; may queue client publish of `check_date` via editor flow.

---

## Identity resolution

### `GET /api/v1/businesses/{id}/relink-proposals`

Pending proposals for broken links.

### `POST /api/v1/businesses/{id}/relink-proposals/{proposalId}/confirm`

Human confirm — updates place link to candidate OSM identity.

### `POST /api/v1/businesses/{id}/relink-proposals/{proposalId}/reject`

---

## Notes fallback

### `POST /api/v1/businesses/{id}/notes/draft`

Returns suggested note text; **client** posts to OSM Notes API with user token (`write_notes` when enabled).

---

## Errors (common)

| Code | Meaning |
|------|---------|
| 401 | Not signed in |
| 403 | Not owner / edit without claim |
| 404 | Unknown business |
| 422 | Validation (tag length, bad source, prohibited source) |
| 503 | OSM readonly/offline — writes paused |

---

## Internal worker contracts (Inngest)

Not public HTTP; documented for implementers:

| Event | Purpose |
|-------|---------|
| `monitoring/reconcile` | Batch-fetch OSM versions for active place_links |
| `monitoring/classify` | Emit ChangeEvents |
| `notifications/digest.daily` | Collapse per-user changes → ≤1 email/UTC day |
| `notifications/freshness.scan` | Queue freshness for due businesses |
| `matching/propose-relink` | On broken link, create RelinkProposals |

Worker must check OSM capabilities `status` before write-adjacent work; pause when readonly.
