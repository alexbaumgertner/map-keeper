# UI Contract: Claim by OSM Object Identity

**Screen**: existing `/claim` (Find and claim your venue)

## Layout

1. **Primary (unchanged)**: map + name/address search + search results + Claim / watch.
2. **Secondary (new, always visible, quieter)**: section below search (or under search results area) titled e.g. “Claim by map object id” — not equal prominence to search; not collapsed behind “Advanced”.

## Identity section controls

| Control | Behavior |
|---------|----------|
| Text input | Placeholder for `relation/123` or OSM object URL; optional separate type + id controls OK |
| Look up | Requires signed-in session; calls `/api/v1/osm/lookup`; disabled while in flight |
| Preview card | Shown only after successful look-up: display name or `type/id`, type/id line, location if present |
| Category | Select: Food & drink / Accommodation / Other — **default Other** |
| Claim / watch | Enabled only when preview is present; calls claim with `resolveMode: "editing_host"` |

## Messages

| Condition | UI |
|-----------|-----|
| Not signed in | Same pattern as search (“sign in required”) |
| Parse error | Inline validation; no preview |
| Not found on editing host | Clear error; Claim disabled / hidden |
| Host error | Temporary failure; retry |
| Claim success (201) | Success message + claim note (watch link only) |
| Already watched (200) | Soft success + link/button to existing place (`/places/{id}/edit` or places list) |

## Copy constraints

- Claim remains “watch link only” — no ownership language.
- Product chrome title stays Map Watcher / Mapkeeper; describing “OpenStreetMap object id” in helper text is fine.
