# Data Model: Claim by OSM Object Identity

**Feature**: `003-claim-by-osm-id`  
**Date**: 2026-08-27

No new persistence tables. This feature reuses the existing watched-place / claim model and adds transient look-up DTOs plus parse results.

## Entities

### Map object identity (value)

| Field | Type | Rules |
|-------|------|--------|
| `osmType` | `node` \| `way` \| `relation` | Required |
| `osmId` | positive integer | Required |

Parsed from UI fields, `type/id` string, or allowlisted OSM object URL. Identity alone does not create a watch.

### Look-up preview (transient)

Returned by look-up API; not stored until claim.

| Field | Type | Notes |
|-------|------|--------|
| `osmType` / `osmId` | identity | From editing-host element |
| `displayName` | string \| null | Prefer `tags.name`, else null (UI may show `type/id`) |
| `lat` / `lon` | number \| null | Present for nodes when OSM returns them; often null for ways/relations in v1 |
| `version` | number \| null | For claim snapshot |
| `tags` | record \| null | Subset for preview (at least name-related); full tags optional |

### Watched place (claim) — existing

Unchanged meaning: owner ↔ OSM identity watch link.

| Field | Relevance |
|-------|-----------|
| `ownerUserId` | Session user |
| `osmType` / `osmId` | Unique per owner for active claim |
| `vertical` | `food_drink` \| `accommodation` \| `other` — identity path defaults **other** |
| `displayName` | From tags or `type/id` fallback |
| `osmVersion` | From editing-host element at claim time |
| `lat` / `lon` | Optional |
| `status` / `linkStatus` | Existing published + active claim semantics |
| `fingerprint` | Existing tag fingerprint helper |

**Uniqueness**: One active watched place per (`ownerUserId`, `osmType`, `osmId`). Re-claim returns the existing entity (`alreadyWatched`).

## Validation rules

- `osmId` must be a positive integer; reject zero/negative/non-numeric before network I/O.
- Look-up and identity-mode claim resolve **only** against configured editing host.
- Identity-mode claim MUST NOT invent an element from client `name`/`lat`/`lon` if the host returns not found.
- Category on identity claim: default `other`; allow `food_drink` / `accommodation` before claim.

## State transitions

```text
[typed/pasted identity]
        │
        ▼
   parse OK? ──no──► validation error (no network)
        │ yes
        ▼
   GET look-up (editing host)
        │
   ┌────┴────┐
   missing   found → Preview (no watch)
   │              │
   │              ▼
   │         Claim / watch
   │              │
   │         ┌────┴────┐
   │      new watch  already exists
   │         │            │
   │         ▼            ▼
   │      Watched      same Watched + alreadyWatched
   │
   └─► error; Claim disabled
```

No OpenStreetMap write at any step.
