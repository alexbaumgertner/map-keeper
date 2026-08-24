# Research: Map UI from Figma (UUI)

**Feature**: `002-uui-map-ui` | **Date**: 2026-08-24

## 1. EPAM UUI + Next.js (Loveship)

**Decision**: Add `@epam/uui-core`, `@epam/uui-components`, `@epam/uui`, and `@epam/loveship` to `apps/web` at matching versions; import UUI/Loveship CSS in root layout; set `uui-theme-loveship` on `<body>`; implement Start and Add Business controls with UUI `Button`, `TextInput`, `PickerInput`/`Select`, tab/segment controls, `IconButton`, `Text`, `Panel`/`FlexRow` as needed. Follow [UUI Getting Started](https://uui.epam.com/documents?id=gettingStarted&mode=doc&theme=loveship) and the official [Next.js template](https://github.com/epam/UUI/tree/main/templates/uui-nextjs-template) patterns (client components for interactive UUI; providers if template requires).

**Rationale**: Spec Assumptions mandate UUI Loveship; Figma frames use UUI tokens/components. Official docs list Next.js as a supported integration.

**Alternatives considered**:
- Tailwind-only recreation of UUI look — rejected (fragile, fails design-system requirement).
- Electric/Promo skins — rejected (mockups/Loveship docs theme).
- Full-app UUI migration in one PR — deferred; only these screens + shared shell pieces.

## 2. MapLibre chrome vs Figma controls

**Decision**: Keep MapLibre for basemap/interaction; hide default `NavigationControl` and implement zoom+/− and locate as UUI icon buttons overlaid top-right; search field as UUI `TextInput` top-left; pin as MapLibre `Marker` (or layer) on click. Full-height map fills remaining viewport beside ~400px panel.

**Rationale**: Existing `MapView` already uses OSM raster tiles (allowlisted vs Google). Figma shows custom white floating controls, not MapLibre’s default control chrome.

**Alternatives considered**:
- Keep MapLibre NavigationControl styling — rejected (doesn’t match Figma).
- Switch basemap library — rejected (unnecessary risk).

## 3. Geographic search without public Nominatim

**Decision**: Add `GET /api/v1/geo/search?q=` that:
1. If `q` parses as coordinates (decimal or simple DMS), returns a single result and the client `flyTo`s.
2. Otherwise proxies **Photon** (Komoot) forward geocode (`https://photon.komoot.io/api/`) server-side with short timeout, limit, and User-Agent identifying Mapkeeper; map results to `{ label, lat, lon }`.

Venue claim search remains `GET /api/v1/discover/search` (Overpass) — out of scope for redesign.

**Rationale**: Constitution forbids the **public Nominatim** instance. Photon is a separate OSM-based geocoder commonly used for this purpose. Server proxy avoids CORS and lets us fail soft (SC-style messaging).

**Alternatives considered**:
- Public Nominatim — forbidden.
- Coordinates-only search — fails FR-008 placeholder (“Country, region, city…”).
- Self-hosted Nominatim — too heavy for this feature.
- Client-side Photon — worse rate-limit/UA control.

## 4. Incomplete draft autosave & resume

**Decision**: Extend create/update draft APIs to accept partial payloads:
- At least one of: `displayName`, `properName`, `businessType`, `externalPageUrl`, `lat`+`lon`, `vertical`
- On Add Business **close** with dirty form: `POST` (new) or `PATCH` (existing `?draftId=`) then navigate home
- On reopen: if user has an incomplete draft, deep-link `/places/new?draft=<id>` (or equivalent) prefilled
- Empty close (no dirty fields): no write

Store `properName`, `businessType`, `externalPageUrl` as `attributes` with `source=owner` (URL value only). Never HTTP-fetch the URL.

**Rationale**: Clarification chose autosave on close; existing POST requires full name+lat+lon and cannot represent incomplete drafts.

**Alternatives considered**:
- SessionStorage-only drafts — rejected (won’t survive devices; clarification implies Mapkeeper draft).
- Confirm-discard — rejected by clarification.
- Always require lat/lon before any save — rejected (user may close after typing names only).

## 5. Auth redirect for Add Business

**Decision**: Reuse existing `GET /api/v1/auth/osm/start?redirect=/places/new` (path may be aliased). Sign Up, Login, and signed-out Add Business all hit start with appropriate `redirect`. Callback already restores `redirect` from OAuth `state`.

**Rationale**: Callback already supports path redirects; no new OAuth provider.

**Alternatives considered**:
- Return only to `/` after auth — rejected by clarification.
- Separate signup vs login endpoints — unnecessary (same OAuth).

## 6. Signed-in start panel

**Decision**: Client or server-rendered start page reads `/api/v1/auth/me` (or session); if logged in, show `osmDisplayName` + Log out (`POST /api/v1/auth/logout`); else Sign Up / Login. Title always **Map Watcher**.

**Rationale**: Clarification B; Figma only shows signed-out chrome.

## 7. UUI + Tailwind coexistence

**Decision**: Import UUI CSS globally; keep Tailwind for page layout (`flex`, full viewport) where needed; prefer UUI for buttons/inputs/tabs on these screens. Avoid fighting UUI with broad Tailwind resets on UUI subtrees.

**Rationale**: App already uses Tailwind; ripping it out is out of scope.

## 8. Business type & vertical mapping

**Decision**: Housing tab → `vertical=accommodation`; Food → `vertical=food_drink`. Curated type lists (e.g. guest house, hotel… / cafe, restaurant…) stored as attribute `business_type` (or OSM tag key when Next continues into editor). Default Housing selected.

**Rationale**: Spec assumptions; keeps Add Business simple vs full id-tagging-schema on step 1.

## Resolved NEEDS CLARIFICATION

None remain from Technical Context — all items decided above.
