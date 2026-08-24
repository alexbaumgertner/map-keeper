export type GeoResult = { label: string; lat: number; lon: number };

/** Parse "lat, lon" or "lat lon" decimal pairs. */
export function parseCoordinates(q: string): GeoResult | null {
  const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { label: `${lat}, ${lon}`, lat, lon };
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; city?: string; state?: string; country?: string };
};

/**
 * Forward geocode via Photon (not public Nominatim).
 * Server-side only — identify the product in User-Agent.
 */
export async function searchPhoton(q: string, limit = 5): Promise<GeoResult[]> {
  const coords = parseCoordinates(q);
  if (coords) return [coords];

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mapkeeper/MapWatcher (https://github.com/map-keeper; geo search)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Photon returned ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .map((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      const lon = coords[0];
      const lat = coords[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const p = f.properties ?? {};
      const label = [p.name, p.city, p.state, p.country].filter(Boolean).join(', ') || `${lat}, ${lon}`;
      return { label, lat, lon } satisfies GeoResult;
    })
    .filter((x): x is GeoResult => x != null);
}
