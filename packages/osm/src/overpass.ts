import { getOsmApiBase } from './oauth';

export type OverpassResult = {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name?: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_URL,
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
].filter((u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i);

const AMENITY_ALIASES: Record<string, string> = {
  cafe: 'cafe',
  café: 'cafe',
  coffee: 'cafe',
  restaurant: 'restaurant',
  pub: 'pub',
  bar: 'bar',
  hotel: 'hotel',
  shop: 'shop',
};

function buildQuery(params: {
  q: string;
  lat: number;
  lon: number;
  radius: number;
  limit: number;
}): string {
  const q = params.q.trim().toLowerCase();
  const amenity = AMENITY_ALIASES[q];
  if (amenity) {
    return `
[out:json][timeout:8];
nwr["amenity"="${amenity}"](around:${params.radius},${params.lat},${params.lon});
out center ${params.limit};
`.trim();
  }
  const escaped = params.q.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&').replace(/"/g, '\\"');
  return `
[out:json][timeout:8];
nwr["name"~"${escaped}",i]["amenity"](around:${params.radius},${params.lat},${params.lon});
out center ${params.limit};
`.trim();
}

async function postOverpass(
  url: string,
  query: string,
): Promise<{ ok: true; json: unknown } | { ok: false; retry: boolean; status?: number }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mapkeeper/0.1 (https://github.com/alexbaumgertner/map-keeper)',
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) return { ok: true, json: await res.json() };
    const retry = [429, 502, 503, 504, 406].includes(res.status);
    return { ok: false, retry, status: res.status };
  } catch {
    return { ok: false, retry: true };
  }
}

export async function searchVenues(params: {
  q: string;
  lat: number;
  lon: number;
  radiusM?: number;
  limit?: number;
}): Promise<OverpassResult[]> {
  const radius = Math.min(params.radiusM ?? 1500, 2000);
  const limit = Math.min(params.limit ?? 20, 20);
  const query = buildQuery({ q: params.q, lat: params.lat, lon: params.lon, radius, limit });

  let lastStatus: number | undefined;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const result = await postOverpass(endpoint, query);
    if (result.ok) {
      const data = result.json as {
        elements?: Array<{
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
    lastStatus = result.status;
    if (!result.retry) throw new Error(`Overpass error: ${result.status}`);
  }
  throw new Error(
    lastStatus
      ? `Overpass error: ${lastStatus}`
      : 'OpenStreetMap search timed out. Try again in a few seconds.',
  );
}

/** Intentionally unused — discovery must not use editing API map extract. */
export function forbiddenMapEndpoint(): string {
  return `${getOsmApiBase()}/api/0.6/map`;
}
