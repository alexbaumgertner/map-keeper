# Quickstart results: Claim by OSM Object Identity

**Date**: 2026-08-27  
**Environment**: Unit/package validation + editing-host API probes (full signed-in UI pass deferred to deploy with session)

## Automated / offline checks

| Check | Result |
|-------|--------|
| `pnpm --filter @mapkeeper/osm test` (identity + claim-resolve) | PASS (5 tests) |
| `pnpm --filter @mapkeeper/osm typecheck` | PASS |
| `pnpm --filter @mapkeeper/web typecheck` | PASS |
| `parseOsmIdentity('relation/4305236658')` | `{ osmType: 'relation', osmId: 4305236658 }` |
| `parseOsmIdentity` api06 URL | same identity |
| Sandbox `GET …/relation/4305236658.json` | 200 (earlier session) |
| Public `GET …/relation/4305236658.json` | 404 (earlier session) |
| `resolveMode=editing_host` never calls `fetchPublicElement` | Covered by `claim-resolve.test.ts` |

## Manual UI (signed-in)

Run against local `127.0.0.1:3000` or https://map-keeper-web.vercel.app with sandbox OAuth:

1. Sign in → `/claim` → **Claim by map object id** → paste `relation/4305236658` → Look up → Claim / watch (category Other).
2. Paste `https://api06.dev.openstreetmap.org/relation/4305236658` → same preview.
3. Look up `node/1` (or absent id) → not found; Claim hidden.
4. Claim same id again → already watched + Open place link.
5. Name search still uses Overpass + `resolveMode: default`.

Record pass/fail here after a live session if needed.
