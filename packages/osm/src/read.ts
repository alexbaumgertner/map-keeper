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
};

export async function fetchElements(
  type: 'nodes' | 'ways' | 'relations',
  ids: number[],
  accessToken?: string,
): Promise<OsmElement[]> {
  if (ids.length === 0) return [];
  if (ids.length > 725) {
    throw new Error('OSM multi-fetch capped at 725 IDs per request');
  }
  const base = getOsmApiBase();
  const key = type.slice(0, -1); // node/way/relation
  const url = `${base}/api/0.6/${type}?${key}s=${ids.join(',')}`;
  const headers: HeadersInit = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OSM fetch failed: ${res.status}`);
  const data = (await res.json()) as { elements?: OsmElement[] };
  return data.elements ?? [];
}

export async function fetchElement(
  type: 'node' | 'way' | 'relation',
  id: number,
  accessToken?: string,
): Promise<OsmElement | null> {
  const plural = `${type}s` as 'nodes' | 'ways' | 'relations';
  const els = await fetchElements(plural, [id], accessToken);
  return els[0] ?? null;
}
