# Quickstart: Validate Claim & Monitoring MVP

**Feature**: `001-claim-monitoring`  
**Purpose**: Runnable validation checklist after implementation — not an implementation guide.

## Prerequisites

- Node.js 24+, pnpm
- Neon Postgres with PostGIS enabled
- OSM **dev** OAuth application registered for `http://127.0.0.1:3000` (not `localhost`)
- Accounts on `https://master.apis.dev.openstreetmap.org/`
- Env: database URL, OSM OAuth client id/secret, Resend API key (or mock), Overpass endpoint, optional LocationIQ/Photon

See [research.md](./research.md) and [contracts/api.md](./contracts/api.md).

## Setup (expected commands once scaffolded)

```bash
pnpm install
pnpm --filter @mapkeeper/db migrate
pnpm --filter web dev   # must bind/advertise 127.0.0.1:3000 for OAuth
```

Worker (separate terminal):

```bash
pnpm --filter sync dev
```

## Validation scenarios

### V1 — Auth & claim existing (P1)

1. Open `http://127.0.0.1:3000`, sign in with OSM **dev** account.
2. Search for an existing amenity via discover search ([contracts](./contracts/api.md)).
3. Claim it; confirm it appears in watched list.
4. Confirm UI states claim is watch-only (no exclusivity).
5. Claim a second place with the same account (multi-watch).

**Expect**: Session without Mapkeeper password; two watched businesses; no OSM write yet if only claiming existing.

### V2 — Draft without OSM write (clarify)

1. Start “place not on map” flow; place pin; save draft.
2. Inspect DB / API: business `draft`, place_link without `osm_id`.
3. Confirm no changeset on OSM dev for this action.

**Expect**: Local draft only until publish.

### V3 — Publish with preview (P3)

1. Open editor for claimed draft or node (owner only).
2. Fill required tags; open diff preview; cancel once — no write.
3. Publish successfully to OSM **dev**.
4. Confirm changeset tags: `created_by`, editable `comment`, allowlisted `source`.
5. Confirm `publish-recorded` updated `osm_version`.

**Expect**: Matches [osm-publish.md](./contracts/osm-publish.md).

### V4 — Conflict merge (P3)

1. Load editor for a claimed node.
2. In another client/tool, bump the same node on OSM dev.
3. Attempt publish from Mapkeeper.

**Expect**: Three-way merge UI; no silent overwrite.

### V5 — Monitoring digest (P2)

1. With an active place_link, change tags externally on OSM dev.
2. Trigger or wait for `monitoring/reconcile` + digest job.
3. If OSM email usable: ≤1 digest email that day with what/who/when + links.
4. If email missing: `skipped_no_email` + in-app notice; no invented address.

### V6 — Relink human gate (P4)

1. Delete or replace watched object on OSM dev so link breaks.
2. Confirm RelinkProposal appears; reject once — stays broken.
3. Confirm another proposal — link becomes active on new id.

**Expect**: Never auto-relink.

### V7 — Autofill allowlist (P5)

1. Confirm website candidate path stores `candidates` only.
2. Confirm fields into attributes with `source=website` or `owner`.
3. Attempt prohibited source path (should 422 / impossible in UI).

### V8 — Claim-gated edit (clarify)

1. Sign in as user A; note a place claimed only by user B (or unclaimed).
2. Attempt editor publish API for that business.

**Expect**: 403; directed to claim first.

### V9 — SEO landing smoke (P7)

1. Open one English guide route for `{vertical} × {app}`.
2. Confirm substantive content + CTA into signup/claim.

## Automated checks (once present)

```bash
pnpm test                 # unit + contract
pnpm --filter web e2e     # Playwright against OSM dev where safe
```

## Definition of done for this quickstart

- [ ] V1–V9 pass on OSM **dev**
- [ ] No production changeset opened during validation
- [ ] `taginfo.json` present at repo root (content may be draft)
- [ ] Constitution gates still hold (no bulk write, no Google source, human confirm)
