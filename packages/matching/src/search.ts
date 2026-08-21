export type GeoCandidate = {
  osmType: string;
  osmId: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function filterWithinRadius(
  origin: { lat: number; lon: number },
  candidates: GeoCandidate[],
  radiusM = 150,
): GeoCandidate[] {
  return candidates.filter((c) => haversineM(origin, c) <= radiusM);
}
