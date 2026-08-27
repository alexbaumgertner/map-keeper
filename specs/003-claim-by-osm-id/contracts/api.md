# API Contracts: Claim by OSM Object Identity

Base: `/api/v1`  
Auth: OSM OAuth session cookie (required for all endpoints below).

Extends [001 claim API](../../001-claim-monitoring/contracts/api.md). Name search (`GET /discover/search`) unchanged.

---

## `GET /api/v1/osm/lookup`

Resolve one object on the **configured editing host** (`OSM_API_BASE`). Does not create a watch. Does not query Overpass or `api.openstreetmap.org` (unless that host *is* the configured base).

### Query

| Param | Required | Description |
|-------|----------|-------------|
| `osmType` | one of | `node` \| `way` \| `relation` — required unless `q` parses to type+id |
| `osmId` | one of | positive integer — required unless `q` provided |
| `q` | optional | Compact `type/id` or allowlisted OSM object URL (see research R3) |

If both `q` and typed fields are sent, typed fields win after successful parse of either form.

### Responses

**200** — preview:

```json
{
  "osmType": "relation",
  "osmId": 4305236658,
  "displayName": "აგროჰაბი",
  "lat": null,
  "lon": null,
  "version": 1,
  "tags": { "name": "აგროჰაბი", "shop": "supermarket" }
}
```

**401** — not signed in  
**422** — invalid type/id / unparseable `q` / object not found on editing host  
**502** — editing host unavailable

---

## `POST /api/v1/businesses/claim` (extended)

### Body (additions)

```json
{
  "osmType": "relation",
  "osmId": 4305236658,
  "vertical": "other",
  "resolveMode": "editing_host"
}
```

| Field | Notes |
|-------|--------|
| `vertical` | Default **`other`** when omitted for identity clients; search UI may still send `food_drink` |
| `resolveMode` | `"editing_host"` — **required for identity UI**. `"default"` or omitted — legacy search path (editing host then public fallback + optional client name/lat synthesize) |

When `resolveMode` is `"editing_host"`:
- Fetch only via `fetchElement(..., getOsmApiBase())`
- If missing → **422** `OSM object not found` (no public fallback, no client synthesize)

### Responses

**201** — new watch created (same shape as today + `claimNote`)

**200** — already watched:

```json
{
  "id": "…",
  "alreadyWatched": true,
  "osmType": "relation",
  "osmId": 4305236658,
  "displayName": "აგროჰაბი",
  "vertical": "other",
  "claimNote": "Claim is an internal watch link only. …"
}
```

**401** / **422** / **502** — as today / look-up

---

## Non-goals

- No `/api/0.6/map` proxy
- No bulk claim-by-changeset endpoint
- No change to OAuth scopes
