/**
 * Browser helpers for OSM publish. Prefer POST /api/v1/businesses/[id]/publish
 * (server uses the user's session token) because the OSM API does not allow
 * browser CORS writes from arbitrary origins.
 */
export { publishElementTags, type PublishTagsResult } from '@mapkeeper/osm';
