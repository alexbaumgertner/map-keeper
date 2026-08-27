import { getOsmApiBase } from './oauth';

export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  version?: number;
  visible?: boolean;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  changeset?: number;
  user?: string;
  /** Present on ways when fetched as a single element. */
  nodes?: number[];
  /** Present on relations when fetched as a single element. */
  members?: Array<{ type: 'node' | 'way' | 'relation'; ref: number; role: string }>;
};

export async function fetchElements(
  type: 'nodes' | 'ways' | 'relations',
  ids: number[],
  accessToken?: string,
  apiBase = getOsmApiBase(),
): Promise<OsmElement[]> {
  if (ids.length === 0) return [];
  if (ids.length > 725) {
    throw new Error('OSM multi-fetch capped at 725 IDs per request');
  }
  const key = type.slice(0, -1); // node/way/relation
  const url = `${apiBase}/api/0.6/${type}?${key}s=${ids.join(',')}`;
  const headers: HeadersInit = {
    Accept: 'application/json',
    'User-Agent': 'Mapkeeper/0.1 (https://github.com/alexbaumgertner/map-keeper)',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  if (res.status === 404 || res.status === 410) return [];
  if (!res.ok) throw new Error(`OSM fetch failed: ${res.status}`);
  const data = (await res.json()) as { elements?: OsmElement[] };
  return data.elements ?? [];
}

export async function fetchElement(
  type: 'node' | 'way' | 'relation',
  id: number,
  accessToken?: string,
  apiBase = getOsmApiBase(),
): Promise<OsmElement | null> {
  // Prefer single-object endpoint so ways/relations include nodes/members.
  const url = `${apiBase}/api/0.6/${type}/${id}.json`;
  const headers: HeadersInit = {
    Accept: 'application/json',
    'User-Agent': 'Mapkeeper/0.1 (https://github.com/alexbaumgertner/map-keeper)',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`OSM fetch failed: ${res.status}`);
  const data = (await res.json()) as { elements?: OsmElement[] };
  return data.elements?.[0] ?? null;
}

/** Read-only lookup on the public OSM API (Overpass IDs live here, not on the sandbox). */
export async function fetchPublicElement(
  type: 'node' | 'way' | 'relation',
  id: number,
): Promise<OsmElement | null> {
  return fetchElement(type, id, undefined, 'https://api.openstreetmap.org');
}
