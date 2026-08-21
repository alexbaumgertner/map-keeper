import { getOsmApiBase } from './oauth';

export type OverpassResult = {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name?: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

export async function searchVenues(params: {
  q: string;
  lat: number;
  lon: number;
  radiusM?: number;
  limit?: number;
}): Promise<OverpassResult[]> {
  const radius = params.radiusM ?? 2000;
  const limit = params.limit ?? 20;
  const overpassUrl = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
  const escaped = params.q.replace(/"/g, '\\"');
  const query = `
[out:json][timeout:25];
(
  node["name"~"${escaped}",i](around:${radius},${params.lat},${params.lon});
  way["name"~"${escaped}",i](around:${radius},${params.lat},${params.lon});
);
out center ${limit};
`.trim();

  const res = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = (await res.json()) as {
    elements: Array<{
      type: 'node' | 'way' | 'relation';
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  return (data.elements ?? []).map((el) => ({
    osmType: el.type,
    osmId: el.id,
    name: el.tags?.name,
    lat: el.lat ?? el.center?.lat ?? params.lat,
    lon: el.lon ?? el.center?.lon ?? params.lon,
    tags: el.tags ?? {},
  }));
}

/** Intentionally unused — discovery must not use editing API map extract. */
export function forbiddenMapEndpoint(): string {
  return `${getOsmApiBase()}/api/0.6/map`;
}
