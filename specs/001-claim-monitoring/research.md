# Research: Claim & Monitoring MVP

**Feature**: `001-claim-monitoring` | **Date**: 2026-08-21

All Technical Context items resolved; no remaining NEEDS CLARIFICATION.

---

## 1. Application framework & hosting

**Decision**: Next.js 16+ App Router on Vercel for `apps/web`; TypeScript throughout.

**Rationale**: Spec requires programmatic SEO, i18n-ready routing (English content only at MVP), and a responsive web app. App Router + MDX fits the guide matrix; Vercel matches web-only hosting while jobs run via Inngest.

**Alternatives considered**:
- Remix / plain Vite SPA — weaker long-tail SEO story for MDX landings
- Payload CMS for pages — deferred by spec; MDX in-repo is enough

---

## 2. Database & ORM

**Decision**: Neon Postgres + PostGIS + Drizzle ORM in `packages/db`.

**Rationale**: Place links need geometry, radius candidate search, and versioned OSM IDs. PostGIS is the natural fit. Neon’s serverless driver suits Vercel. Drizzle gives explicit schema/indexes for fingerprints and allowlisted `source` enums.

**Alternatives considered**:
- MongoDB/Mongoose — conflicts with geo monitoring and constitution-driven relational invariants; rejected
- Prisma — weaker PostGIS ergonomics than Drizzle for this workload
- Vercel Postgres (legacy) — Neon is the current Marketplace path

---

## 3. OSM auth & API client

**Decision**: OSM OAuth 2.0 via browser; scopes `write_api` + `read_prefs` (+ `write_notes` when notes ship). Use `osm-api` (k-yle) in `packages/osm`. Dev target: `https://master.apis.dev.openstreetmap.org/`. Local redirect: `127.0.0.1:3000`.

**Rationale**: Constitution and prior-art route editor both write under the user’s token with no server in the edit path. `read_prefs` supports reading user details including email when OSM exposes it (digest delivery per clarify session).

**Alternatives considered**:
- Server-mediated edits with stored tokens doing writes — reduces auditability and looks like a bulk bot; rejected
- Broader OAuth scopes — violates constitution trust signal

**Email note**: Prefer OSM user details email when present; if absent or private, fail soft (in-app notice). Do not add a Mapkeeper-collected email in MVP.

---

## 4. Discovery vs monitoring vs geocoding

**Decision**:
- **Search/claim discovery**: Overpass (self-host later if volume requires)
- **Monitoring**: Poll `GET /api/0.6/nodes|ways|relations?…` in batches ≤725 IDs; compare `version`; treat `visible=false` as deletion
- **Geocoding**: Photon (self-hosted) or LocationIQ — **never** public Nominatim
- **Abstract** `ChangeSource` so planet/minutely diffs can replace polling later

**Rationale**: OSM wiki forbids using the editing API for bulk read/discovery; public Nominatim forbids product use. Polling is enough at MVP scale (constitution / original brief).

**Alternatives considered**:
- `/api/0.6/map` for “find my venue” — impolite and capped; rejected
- Minutely replication from day one — over-engineering at MVP volume

---

## 5. Tagging & editor surface

**Decision**: Generate forms from `@openstreetmap/id-tagging-schema` in `packages/tagging`. Deep verticals: food & drink + accommodation. Others: basic fields. Visual `opening_hours` builder. Look-then-edit UI. Client-side publish with mandatory diff preview and three-way merge on HTTP 409.

**Rationale**: Constitution forbids inventing a tagging model; vertical-editor prior art (parking-lanes, osm-simple-route-editor) supports domain UX without becoming iD.

**Alternatives considered**:
- Hand-written tag forms — drift and community risk
- Server-side publish proxy — fails auditability preference

---

## 6. Background jobs & email

**Decision**: Inngest for reconcile → classify → queue digest → send; Resend for transactional email. Freshness reminders on interval (default 180 days). Cap one digest email per user per UTC day.

**Rationale**: Fits Vercel; durable retries; clearer than embedding cron in Next route handlers alone. Resend is simple for digests.

**Alternatives considered**:
- pg-boss on same Postgres — fine fallback if Inngest cost/complexity bites
- Postmark — equivalent; pick one provider in implement phase

---

## 7. Map tiles & imagery policy

**Decision**: MapLibre GL + Protomaps `.pmtiles` on R2/S3. Honour OSM capabilities imagery blacklist (no Google tiles).

**Rationale**: Cheap, no vendor lock-in, constitution-compliant backgrounds.

**Alternatives considered**: Mapbox/Google basemaps — policy and cost risk; rejected for default MVP.

---

## 8. Autofill candidates

**Decision**: MVP autofill from (1) owner manual entry, (2) owner-confirmed website `schema.org/LocalBusiness`, (3) Overture Places above a conservative confidence gate (default start **0.8**, tunable). Store only in `candidates` until confirmation. GBP behind feature flag, not required. AllThePlaces optional later for chains.

**Rationale**: Spec + constitution allowlist; human confirmation keeps procedure as ordinary edits, not imports.

**Alternatives considered**:
- Bulk push Overture → OSM — Import procedure; forbidden
- GBP as MVP dependency — access risk; deferred behind flag

---

## 9. Identity resolution

**Decision**: On broken link, `packages/matching` scores nearby OSM objects by fingerprint (name/brand/address/phone + distance). Present confirm/reject UI; never auto-relink. Search radius default **150 m**, tunable.

**Rationale**: Spec’s moat; constitution requires human gate.

**Alternatives considered**: Auto-relink above score threshold — forbidden by constitution

---

## 10. Licensing & repo split

**Decision**: Public repo from day one. MIT (or equivalent) for `packages/osm` and `packages/tagging`. Matching/monitoring/SEO may be source-available or private later; AGPL whole-repo is an alternative if a single licence is preferred. Record ODbL stance in `docs/licensing.md` before any public dump. Publish `taginfo.json`.

**Rationale**: Community survival condition from constitution; edit path must be auditable.

**Alternatives considered**: Fully closed source — community rejection risk (RocketData pattern)

---

## 11. Draft → publish lifecycle

**Decision**: New venues are Mapkeeper drafts (`businesses` + draft `place_links` without `osm_id`) until explicit publish after preview. Claim/watch allowed on drafts. Editor/publish only for claimed places (clarify session).

**Rationale**: Clarifications on create timing and edit scope; constitution human-confirmation.

---

## Open operational defaults (not blockers)

| Default | Value | Notes |
|---------|-------|-------|
| Overture confidence gate | 0.8 | Tune on pilot city |
| Relink search radius | 150 m | Tune empirically |
| Freshness interval | 180 days | Spec default 6 months |
| Monitoring poll interval | 15–60 min | Start 30 min |
| Digest timezone | UTC day boundary | Document in UI |
