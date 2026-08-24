# Quickstart results: Map UI from Figma (UUI)

**Date**: 2026-08-24  
**Method**: Playwright MCP against `http://127.0.0.1:3000` (viewport 1280×832)

## Automated checks

- [x] `pnpm --filter @mapkeeper/web typecheck` / `build` (prior)
- [x] No public Nominatim requests observed in Playwright network logs
- [x] Coordinate geocode via `GET /api/v1/geo/search?q=59.33%2C%2018.07` → **200**
- [x] `externalPageUrl` persisted on draft; no browser requests to `example.com` / Booking / Airbnb

## Scenario results

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Start screen signed out | **PASS** | Title **Map Watcher**, Add Business, multi-map helper, Sign Up + Login, map search + zoom/locate chrome; `uui-theme-loveship`; no horizontal scroll (`scrollWidth === clientWidth`) |
| 2 | Auth chrome signed in | **PASS** | Showed OSM display name “Alex Baumgertner” + Log out; Add Business stayed primary. Log out restored Sign Up / Login |
| 3 | Signed-out Add Business → OAuth return | **PARTIAL** | Add Business issued `GET /api/v1/auth/osm/start?redirect=%2Fplaces%2Fnew` (correct). Callback failed in this environment: `ENOTFOUND master.apis.dev.openstreetmap.org` (DNS/network), app returned 500 — not a redirect-path bug |
| 4 | Close autosave incomplete draft | **PASS** | Name-only “Autosave Test Cafe” → close → home; `GET /api/v1/businesses` listed draft; resume `?draft=…` prefills full name |
| 5 | Locate + Next | **PASS** | Housing + names + guest house; map click → `59.3300 N, 18.0700 E` + Map marker; Next enabled; navigated to `/places/{id}/edit`; draft stored `externalPageUrl`; no fetch of that URL |
| 6 | Map search | **PARTIAL** | Coords path **PASS**. Photon city search (`Stockholm`) returned **503** soft message “Place search is busy…” (Photon unreachable from agent network). No Nominatim calls |

## Issues noted (non-blocking)

1. **UUI deprecation**: `TabButton` `isLinkActive` → prefer `isActive` (console warning).
2. **Housing tab visual**: selected tab styling may read inverted vs Figma (Food looked filled while Housing was active in a11y tree) — worth a quick visual polish.
3. **OSM tiles**: requests to `tile.openstreetmap.org` returned 200; canvas present (880×832).
4. **Photon / OSM OAuth DNS**: agent environment cannot resolve Photon / OSM master API hostnames intermittently — soft-fail paths work.

## Verdict

**002-uui-map-ui core UI and draft flows verified.** Auth return URL and soft-fail geocode/auth errors behave correctly; full OAuth round-trip and Photon city search need a network that can reach OSM/Photon.
