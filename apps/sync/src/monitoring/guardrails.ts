import { fetchCapabilities } from '@mapkeeper/osm';

export async function assertMonitoringWritable(): Promise<void> {
  const caps = await fetchCapabilities();
  if (caps.status !== 'online') {
    throw new Error(`OSM ${caps.status}: pause write-adjacent work`);
  }
}
