export type OverpassResult = {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name?: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

/**
 * Browser: user's IP can reach overpass-api.de (same as local Next.js).
 * Server/Vercel: AWS cannot TCP to gall/lambert (162.55.144.139, 65.109.112.52).
 */
const BROWSER_OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const SERVER_OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

function overpassEndpoints(): string[] {
  if (typeof window !== 'undefined') return [...BROWSER_OVERPASS_ENDPOINTS];
  const custom = process.env.OVERPASS_URL?.trim();
  const known = new Set([...BROWSER_OVERPASS_ENDPOINTS, ...SERVER_OVERPASS_ENDPOINTS]);
  const urls = [...SERVER_OVERPASS_ENDPOINTS];
  if (custom && !known.has(custom)) urls.unshift(custom);
  return [...new Set(urls)];
}

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

function overpassHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  // Extra headers trigger a CORS preflight; browsers also forbid setting User-Agent.
  if (typeof window === 'undefined') {
    headers['User-Agent'] = 'Mapkeeper/0.1 (https://github.com/alexbaumgertner/map-keeper)';
    headers.Accept = 'application/json';
  }
  return headers;
}

async function postOverpass(
  url: string,
  query: string,
): Promise<{ ok: true; json: unknown } | { ok: false; retry: boolean; status?: number }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: overpassHeaders(),
      body: `data=${encodeURIComponent(query)}`,
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) return { ok: true, json: await res.json() };
    const retry = [429, 502, 503, 504, 406].includes(res.status);
    console.warn(`Overpass ${url} returned ${res.status}${retry ? ', trying next mirror' : ''}`);
    return { ok: false, retry, status: res.status };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'network error';
    console.warn(`Overpass ${url} failed (${reason}), trying next mirror`);
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
  for (const endpoint of overpassEndpoints()) {
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
  const base = process.env.OSM_API_BASE ?? 'https://master.apis.dev.openstreetmap.org';
  return `${base}/api/0.6/map`;
}
