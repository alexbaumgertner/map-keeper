# Quickstart results: Map UI from Figma (UUI)

**Date**: 2026-08-24  
**Environment**: Implementation complete; manual browser pass recommended on `127.0.0.1:3000`

## Automated checks

- [x] `pnpm --filter @mapkeeper/web typecheck` passes
- [x] No public Nominatim client/server calls in codebase (`apps/web/src/lib/geo/photon.ts` uses Photon only)
- [x] `externalPageUrl` stored via draft POST/PATCH only — no fetch/scrape helpers introduced

## Manual scenarios (run locally)

| # | Scenario | Status |
|---|----------|--------|
| 1 | Start screen signed out (Map Watcher, Add Business, Sign Up/Login, map chrome) | Pending browser review |
| 2 | Auth chrome (identity + Log out) | Pending browser review |
| 3 | Signed-out Add Business → OAuth → `/places/new` | Pending browser review |
| 4 | Close autosave incomplete draft | Pending browser review |
| 5 | Pin + Next → editor; URL not fetched | Pending browser review |
| 6 | Geo search / zoom / locate; no Nominatim in network | Pending browser review |

## Notes

- Product title on Map Watcher screens is **Map Watcher** (Figma).
- Basemap remains OSM raster tiles via MapLibre.
- UUI Loveship theme class `uui-theme-loveship` on `<body>`.
