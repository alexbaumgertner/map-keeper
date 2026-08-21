# Contract: Client OSM publish (packages/osm)

Browser-only write path using the signed-in user’s OAuth token. Server MUST NOT perform these calls with a shared account.

## Preconditions

1. User authenticated with scopes including `write_api`.
2. Target business is owned/claimed by the session user (or is their draft).
3. User has passed mandatory diff preview UI.
4. Capabilities endpoint reports `status=online` (not `readonly` / `offline`).
5. Dev builds target `https://master.apis.dev.openstreetmap.org/` until production readiness.

## Sequence

1. `PUT /api/0.6/changeset/create` with tags:
   - `created_by=Mapkeeper <version>`
   - `comment` — user-editable; pre-fill suggestion + wiki link; never locked
   - `source` — allowlisted value; never `Google`
2. `POST /api/0.6/changeset/{id}/upload` OsmChange (XML) for create/modify
   - Updates MUST include current `version`
3. On **HTTP 409**: abort upload; return three-way merge payload to UI (base / remote / local). No blind retry. No last-write-wins.
4. On success: read back new versions from response (never assume +1).
5. `PUT /api/0.6/changeset/{id}/close` (tolerate already-closed 409).
6. Call Mapkeeper `POST /api/v1/businesses/{id}/publish-recorded`.

## Validation before upload

- Tag keys/values ≤ 255 Unicode codepoints
- Geometry: nodes only for create/reshape; ways/relations monitor-only in MVP
- Discard responses that are HTTP 200 but contain embedded `<error>`

## Rate limits

On HTTP 429: exponential backoff with jitter; surface to user; do not drop silently in a way that implies success.
