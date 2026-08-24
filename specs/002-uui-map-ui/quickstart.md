# Quickstart: Map UI from Figma (UUI)

**Feature**: `002-uui-map-ui` | **Date**: 2026-08-24  
**Purpose**: Validate Start + Add Business against [spec.md](./spec.md) after implementation.

## Prerequisites

- Repo deps installed (`pnpm install` at root)
- `apps/web` env: OSM OAuth client on **dev** API; redirect `http://127.0.0.1:3000/api/v1/auth/osm/callback` (constitution)
- Optional `DATABASE_URL` (Neon); memory mode OK for UI smoke if documented in app

## Setup

```bash
pnpm --filter @mapkeeper/web dev
```

Open `http://127.0.0.1:3000` (not `localhost` for OAuth).

## Validation scenarios

### 1. Start screen (signed out)

1. Load `/`.
2. Confirm left panel title **Map Watcher**, Add Business (accent), multi-map helper, Sign Up + Login; map with search + zoom/locate.
3. Compare to Figma `15:2375` (layout/controls).

**Expect**: SC-001 directionally; SC-005 no whole-page horizontal scroll on laptop width.

### 2. Auth chrome

1. Click Login or Sign Up → OSM OAuth → return.
2. Start panel shows display name + Log out; Add Business still primary.
3. Log out → Sign Up / Login return.

**Expect**: SC-004.

### 3. Signed-out Add Business return

1. Signed out, click Add Business.
2. Complete OSM auth.

**Expect**: Land on Add Business (`/places/new`), not only home (SC-007). No draft before auth.

### 4. Add Business incomplete → close autosave

1. Signed in, open Add Business.
2. Enter full name only; close.
3. Confirm a draft exists (`GET /api/v1/businesses` or resume URL).
4. Reopen draft; name prefills.

**Expect**: SC-006; no OSM changeset.

### 5. Locate + Next

1. Housing tab; fill full name, proper name, business type; click map (pin + coordinates).
2. Optionally paste external URL.
3. Next enabled (accent); submit.

**Expect**: Local draft complete fields; navigate toward existing editor; URL stored; **no** network fetch to that URL (devtools); no OSM write (SC-002, SC-003).

### 6. Map search

1. Search a city name → map flies to result.
2. Paste `59.33, 18.07` → flies to coordinates.
3. Force failure (bad network) → non-blocking error.

**Expect**: No Nominatim calls in network log; Photon or coordinate path only ([contracts/api.md](./contracts/api.md)).

## References

- [research.md](./research.md) — UUI, Photon, draft rules  
- [data-model.md](./data-model.md) — attributes / incomplete draft  
- [contracts/ui.md](./contracts/ui.md) — screen contract  
- [contracts/api.md](./contracts/api.md) — API delta  
