/**
 * Browser-side OSM publish entry (user token only).
 * Server must never bulk-write with a shared bot account.
 */
import {
  createChangeset,
  buildOsmChange,
  uploadOsmChange,
  closeChangeset,
  parseDiffResultVersions,
  isConflictStatus,
} from '@mapkeeper/osm';

export async function clientPublish(params: {
  accessToken: string;
  comment: string;
  source: string;
  node: {
    action: 'create' | 'modify';
    id: number;
    version?: number;
    lat: number;
    lon: number;
    tags: Record<string, string>;
  };
}) {
  if (params.source.toLowerCase() === 'google') {
    throw new Error('source must never be Google');
  }
  const changesetId = await createChangeset(params.accessToken, {
    createdBy: `Mapkeeper 0.1.0`,
    comment: params.comment,
    source: params.source,
  });
  const xml = buildOsmChange(changesetId, [params.node]);
  const res = await uploadOsmChange(params.accessToken, changesetId, xml);
  if (isConflictStatus(res.status)) {
    return { conflict: true as const, changesetId };
  }
  if (!res.ok) {
    await closeChangeset(params.accessToken, changesetId).catch(() => undefined);
    throw new Error(`upload failed: ${res.status}`);
  }
  const body = await res.text();
  const versions = parseDiffResultVersions(body);
  await closeChangeset(params.accessToken, changesetId);
  return { conflict: false as const, changesetId, versions };
}
