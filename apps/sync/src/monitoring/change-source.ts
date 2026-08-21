import { fetchElements } from '@mapkeeper/osm';
import { fetchCapabilities } from '@mapkeeper/osm';

export type WatchedRef = { osmType: 'node' | 'way' | 'relation'; osmId: number; osmVersion: number };

export async function reconcileBatch(refs: WatchedRef[]) {
  const caps = await fetchCapabilities();
  if (caps.status !== 'online') {
    return { paused: true as const, status: caps.status, changes: [] };
  }

  const byType = {
    nodes: refs.filter((r) => r.osmType === 'node'),
    ways: refs.filter((r) => r.osmType === 'way'),
    relations: refs.filter((r) => r.osmType === 'relation'),
  };

  const changes: Array<{ ref: WatchedRef; remoteVersion?: number; visible?: boolean }> = [];

  for (const [plural, list] of Object.entries(byType) as Array<
    ['nodes' | 'ways' | 'relations', WatchedRef[]]
  >) {
    for (let i = 0; i < list.length; i += 725) {
      const chunk = list.slice(i, i + 725);
      const els = await fetchElements(
        plural,
        chunk.map((c) => c.osmId),
      );
      const map = new Map(els.map((e) => [e.id, e]));
      for (const ref of chunk) {
        const el = map.get(ref.osmId);
        if (!el || el.visible === false || (el.version ?? 0) !== ref.osmVersion) {
          changes.push({
            ref,
            remoteVersion: el?.version,
            visible: el?.visible,
          });
        }
      }
    }
  }

  return { paused: false as const, status: caps.status, changes };
}
