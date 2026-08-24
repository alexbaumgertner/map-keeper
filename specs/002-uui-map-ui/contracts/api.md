# API Contracts: Map UI (delta)

**Feature**: `002-uui-map-ui` | **Date**: 2026-08-24  
**Base**: [../../001-claim-monitoring/contracts/api.md](../../001-claim-monitoring/contracts/api.md)

Auth: session cookie from OSM OAuth. No new auth providers.

---

## Auth (behavior clarifications)

### `GET /api/v1/auth/osm/start`

Query `redirect` MUST accept `/places/new` (Add Business). Sign Up, Login, and signed-out Add Business use this with appropriate redirect.

### `GET /api/v1/auth/osm/callback`

Unchanged: restores `redirect` from `state` when path starts with `/`.

### `GET /api/v1/auth/me`

**200** used by start panel for signed-in chrome: at least `displayName` (OSM), `isLoggedIn`.

### `POST /api/v1/auth/logout`

**204** — start panel Log out.

---

## Businesses — incomplete drafts

### `POST /api/v1/businesses`

Create draft (complete or incomplete).

**Body** (Zod-style):

```json
{
  "vertical": "accommodation | food_drink | other",
  "displayName": "string (optional if incomplete)",
  "properName": "string (optional)",
  "businessType": "string (optional)",
  "externalPageUrl": "string URL (optional)",
  "lat": "number (optional)",
  "lon": "number (optional)",
  "complete": "boolean (optional, default false)"
}
```

**Rules**:
- If `complete=true` (Next): require `displayName`, `properName`, `businessType`, `lat`, `lon`.
- If `complete=false` (autosave): require at least one provided field among the optional set (including lat+lon as a pair).
- MUST NOT fetch `externalPageUrl`.
- MUST NOT open OSM changesets.
- **201** returns watched-place-shaped record including `id`, `status: "draft"`, attrs as available.

### `PATCH /api/v1/businesses/{id}`

Update owned draft. Same body fields (all optional). Used for close autosave and pin moves before Next.

**403/404** if not owner / missing.  
**422** if `complete=true` and required fields missing.

### `GET /api/v1/businesses/{id}`

Existing — used to resume Add Business prefill.

---

## Geocode (new)

### `GET /api/v1/geo/search`

Query: `q` (required), `limit` (default 5, max 10).

**Auth**: optional for start-screen map search; prefer requiring session only if abuse appears — default **public or session** (plan: allow unauthenticated for start map UX; rate-limit).

**200**:
```json
{
  "results": [
    { "label": "Stockholm, Sweden", "lat": 59.33, "lon": 18.07 }
  ]
}
```

**Behavior**:
- Coordinate parse → single result
- Else Photon proxy; on upstream failure → **503** with soft message (client shows non-blocking error)

MUST NOT call public Nominatim.

---

## Explicitly out of contract

- Any endpoint that fetches or scrapes Booking/Airbnb/aggregator page content
- OSM element create/update from Add Business Next
