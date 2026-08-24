# UI Contract: Map Watcher Start + Add Business

**Feature**: `002-uui-map-ui` | **Date**: 2026-08-24  
**Design sources**: Figma nodes `15:2375`, `3:2`, `13:215` (file `G30bAAgRmamDTVwGXUepay`)  
**Component system**: EPAM UUI Loveship ([docs](https://uui.epam.com/documents?category=components&id=accordion&mode=doc&theme=loveship))

## Shared layout

| Region | Spec |
|--------|------|
| Shell | Full viewport; left panel ~400px; map flex-grow full height |
| Title | Exact string `Map Watcher` on start panel |
| Map search | Top-left over map; placeholder about country/region/city/coordinates |
| Map tools | Top-right: zoom in, zoom out, locate (UUI icon buttons, white surface) |
| Basemap | Allowlisted OSM-compatible tiles only (current MapLibre OSM raster OK) |

## Start screen (`/`)

| Element | Signed out | Signed in |
|---------|------------|-----------|
| Add Business | Accent (green) primary; helper multi-map copy | Same |
| Bottom actions | Sign Up (primary blue) + Login (secondary) | OSM display name + Log out |
| Add Business click | `auth/osm/start?redirect=/places/new` | Navigate `/places/new` |

## Add Business (`/places/new`)

| Element | Behavior |
|---------|----------|
| Title | `Add a Business` + close |
| Tabs | Housing (default) / Food → vertical mapping |
| Full name | TextInput + helper |
| Pure proper name | TextInput + helper |
| Business type | Picker/Select; options depend on tab |
| Location | Prompt *or* coordinates when pin set |
| External URL | Optional; label per Figma; store only |
| Next | Disabled until complete; accent when enabled; `complete=true` save → editor |
| Close | Dirty → incomplete save then home; clean → home |
| Map click | Set/move single pin; update coordinates |

## States

1. **Location pending** — no pin; Next disabled  
2. **Located** — pin + coordinates; Next enabled when fields valid  

## Non-goals

- Claim-existing-OSM flow UI  
- Diff preview / conflict merge chrome  
- Aggregator “grab info” network behavior  
