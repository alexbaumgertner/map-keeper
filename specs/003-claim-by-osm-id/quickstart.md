# Quickstart: Claim by OSM Object Identity

Validate this feature against the **OSM sandbox** editing host (same DB as [api06 changeset example](https://api06.dev.openstreetmap.org/changeset/668705)).

## Prerequisites

- App running locally (`pnpm dev` → `http://127.0.0.1:3000`) **or** deploy with:
  - `OSM_API_BASE=https://master.apis.dev.openstreetmap.org` (or `https://api06.dev.openstreetmap.org`)
  - Matching `OSM_OAUTH_*` app registered on that host
  - Redirect URI for the environment
- Signed-in with a **sandbox** OSM account (not www.openstreetmap.org)

## Sample object

Prefer a sandbox-only id (404 on public API), e.g. from the test changeset:

- `relation/4305236658` (Agrohub / აგროჰაბი)

Confirm:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -A 'Mapkeeper/0.1' \
  'https://master.apis.dev.openstreetmap.org/api/0.6/relation/4305236658.json'
# expect 200

curl -sS -o /dev/null -w '%{http_code}\n' -A 'Mapkeeper/0.1' \
  'https://api.openstreetmap.org/api/0.6/relation/4305236658.json'
# expect 404
```

## Scenarios

### 1. Look up then claim (P1)

1. Open `/claim`, sign in if needed.
2. Leave name search alone; use **Claim by map object id**.
3. Paste `relation/4305236658` → **Look up**.
4. Expect preview (name and/or type/id); category defaults to **Other**.
5. Click **Claim / watch**.
6. Expect success + claim note; place appears under `/places`.

### 2. Paste URL (P2)

1. Paste  
   `https://api06.dev.openstreetmap.org/relation/4305236658`  
   (or www-style URL with same path) → Look up.
2. Expect same preview as compact `relation/4305236658`.
3. Confirm look-up still uses configured editing host (sandbox object found).

### 3. Missing object (P3)

1. Look up `node/1` (or any id absent on sandbox).
2. Expect not-found message; Claim / watch not available.
3. Confirm no new row on `/places`.

### 4. Already watched (soft success)

1. Claim the same id again.
2. Expect “already watched” (or equivalent) and a link to the existing place — not a second watch.

### 5. Regression — name search

1. Search a live-map amenity via name near a known center (Overpass).
2. Claim still works (may use default resolve mode / public fallback as today).

## Contract refs

- [contracts/api.md](./contracts/api.md) — look-up + `resolveMode`
- [contracts/ui.md](./contracts/ui.md) — secondary section behavior
- [data-model.md](./data-model.md) — preview vs watch
