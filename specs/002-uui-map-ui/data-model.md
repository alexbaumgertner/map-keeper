# Data Model: Map UI from Figma (UUI)

**Feature**: `002-uui-map-ui` | **Date**: 2026-08-24  
**Base**: Extends `001-claim-monitoring` model ([../001-claim-monitoring/data-model.md](../001-claim-monitoring/data-model.md))

## Scope

No new top-level tables required. This feature widens **draft** lifecycle semantics and standardizes attribute keys used by the Add Business form.

## Entities (delta)

### Business (existing)

| Field | Change |
|-------|--------|
| status | Remains `draft` until later publish; incomplete drafts stay `draft` |
| vertical | Set from Housing → `accommodation`, Food → `food_drink` |
| display_name | Maps from form **Full name**; for incomplete draft MAY use placeholder (e.g. empty string or `"Untitled"`) when only other fields present — prefer non-empty: use trimmed full name, else proper name, else `"Untitled draft"` |

**Rules**:
- Incomplete draft = `status=draft` and (`place_links.lat/lon` null **or** missing required Add Business fields for Next)
- Next (complete step) requires: non-empty full name, non-empty proper name, business type, lat, lon
- Close autosave: persist whatever subset is present; still no OSM element

### PlaceLink (existing)

| Field | Change |
|-------|--------|
| lat / lon | MAY be null on incomplete drafts |
| status | `draft` while unpublished |
| osm_type / osm_id | Remain null until later publish |

### Attribute keys (owner-sourced; no scrape)

| Key | Value | Source | Notes |
|-----|-------|--------|-------|
| `name` | Pure proper name | `owner` | Form “Pure proper name” |
| `business_type` | Curated label or preset id | `owner` | e.g. `guest_house` |
| `external_page_url` | URL string as typed | `owner` | Stored only; **never** fetched by Mapkeeper in this feature |
| `name:signed` / display | Prefer `businesses.display_name` for full name | — | Full name stays on business row |

Optional future: map `business_type` → id-tagging-schema tags in editor (out of scope here).

## Validation

| Rule | Incomplete save (close) | Next (complete) |
|------|-------------------------|-----------------|
| Auth | Required | Required |
| vertical | Optional (default accommodation) | Required |
| display_name / proper name / type / lat/lon / URL | Any non-empty subset OR pair lat+lon | All of: display_name, proper name, business_type, lat, lon |
| external_page_url | If present, must be syntactically valid URL or absolute http(s) | Same if present |
| OSM write | Forbidden | Forbidden |

## State transitions

```text
[empty form]
    │ close (dirty)
    ▼
incomplete_draft ──resume──► Add Business (prefilled)
    │ Next (valid)
    ▼
complete_local_draft ──► existing editor `/places/{id}/edit` (unchanged publish rules)
```

No transition to OSM published state in this feature.

## Relationships

```text
users 1──* businesses (draft/incomplete)
              │
              ├── 0..1 place_links (lat/lon optional until located)
              └── * attributes (name, business_type, external_page_url)
```
