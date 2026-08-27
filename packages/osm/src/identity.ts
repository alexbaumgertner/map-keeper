export type OsmObjectType = 'node' | 'way' | 'relation';

export type OsmIdentity = {
  osmType: OsmObjectType;
  osmId: number;
};

const TYPE_RE = /^(node|way|relation)$/i;
const COMPACT_RE = /^\s*(node|way|relation)\s*\/\s*(\d+)\s*$/i;
const PATH_RE = /\/(node|way|relation)\/(\d+)(?:\/|$|\?|#)/i;

/** Hosts allowed when parsing pasted OSM object URLs (look-up still uses OSM_API_BASE). */
export const OSM_IDENTITY_URL_HOSTS = new Set([
  'www.openstreetmap.org',
  'openstreetmap.org',
  'api.openstreetmap.org',
  'master.apis.dev.openstreetmap.org',
  'api06.dev.openstreetmap.org',
  'apis.dev.openstreetmap.org',
]);

export class OsmIdentityParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OsmIdentityParseError';
  }
}

function normalizeType(raw: string): OsmObjectType {
  const t = raw.toLowerCase();
  if (t === 'node' || t === 'way' || t === 'relation') return t;
  throw new OsmIdentityParseError('Type must be node, way, or relation');
}

function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new OsmIdentityParseError('OSM id must be a positive integer');
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new OsmIdentityParseError('OSM id must be a positive integer');
  }
  return id;
}

/**
 * Parse compact `type/id` or an allowlisted OpenStreetMap object URL into type + id.
 */
export function parseOsmIdentity(input: string): OsmIdentity {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new OsmIdentityParseError('Identity is required');
  }

  const compact = COMPACT_RE.exec(trimmed);
  if (compact) {
    return { osmType: normalizeType(compact[1]!), osmId: parseId(compact[2]!) };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new OsmIdentityParseError(
      'Enter type/id (e.g. relation/123) or an OpenStreetMap object URL',
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OsmIdentityParseError('URL must be http(s)');
  }

  const host = url.hostname.toLowerCase();
  if (!OSM_IDENTITY_URL_HOSTS.has(host)) {
    throw new OsmIdentityParseError('URL host is not a recognized OpenStreetMap site');
  }

  const pathMatch = PATH_RE.exec(url.pathname);
  if (!pathMatch) {
    throw new OsmIdentityParseError('URL must contain /node|way|relation/<id>');
  }

  return { osmType: normalizeType(pathMatch[1]!), osmId: parseId(pathMatch[2]!) };
}

export function isOsmObjectType(value: string): value is OsmObjectType {
  return TYPE_RE.test(value);
}
