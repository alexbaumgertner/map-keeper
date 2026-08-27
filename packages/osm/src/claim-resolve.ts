import type { OsmElement } from './read';
import { fetchElement, fetchPublicElement } from './read';
import type { OsmObjectType } from './identity';

export type ClaimResolveMode = 'editing_host' | 'default';

/**
 * Resolve an OSM element for claim. Identity path never falls back to the public API.
 */
export async function resolveElementForClaim(params: {
  osmType: OsmObjectType;
  osmId: number;
  accessToken?: string;
  resolveMode: ClaimResolveMode;
  fallback?: { name?: string; lat?: number; lon?: number; tags?: Record<string, string> };
}): Promise<OsmElement | null> {
  const fromHost = await fetchElement(params.osmType, params.osmId, params.accessToken);
  if (fromHost) return fromHost;

  if (params.resolveMode === 'editing_host') {
    return null;
  }

  const fromPublic = await fetchPublicElement(params.osmType, params.osmId);
  if (fromPublic) return fromPublic;

  const fb = params.fallback;
  if (fb && (fb.name || fb.lat != null)) {
    return {
      type: params.osmType,
      id: params.osmId,
      lat: fb.lat,
      lon: fb.lon,
      tags: { name: fb.name ?? '', ...fb.tags },
    };
  }
  return null;
}
