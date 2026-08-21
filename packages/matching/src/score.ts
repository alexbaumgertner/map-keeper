import type { Fingerprint } from './fingerprint';
import { normalizePhone } from './fingerprint';
import type { GeoCandidate } from './search';
import { haversineM } from './search';

export function scoreCandidate(
  fp: Fingerprint,
  origin: { lat: number; lon: number },
  candidate: GeoCandidate,
): number {
  let score = 0;
  const name = candidate.tags.name?.toLowerCase();
  if (fp.name && name && (name.includes(fp.name) || fp.name.includes(name))) score += 0.4;
  if (fp.brand && candidate.tags.brand?.toLowerCase() === fp.brand) score += 0.2;
  const phone = normalizePhone(candidate.tags.phone || candidate.tags['contact:phone']);
  if (fp.phone && phone && fp.phone === phone) score += 0.25;
  const dist = haversineM(origin, candidate);
  score += Math.max(0, 0.15 * (1 - dist / 150));
  return Math.min(1, score);
}

/** Never auto-apply — caller must require human confirm/reject. */
export const AUTO_RELINK_FORBIDDEN = true;
