import { buildFingerprint } from '@mapkeeper/matching';
import type { OsmElement } from '@mapkeeper/osm';

export function snapshotFromElement(el: OsmElement) {
  return {
    osmVersion: el.version,
    lat: el.lat,
    lon: el.lon,
    fingerprint: buildFingerprint(el.tags ?? {}),
  };
}
