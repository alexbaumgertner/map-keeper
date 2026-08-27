import { assertWritable, fetchCapabilities } from './capabilities';
import { getOsmApiBase } from './oauth';
import { isConflictStatus } from './merge';
import type { OsmElement } from './read';
import { fetchElement } from './read';

const MAX_TAG_CODEPOINTS = 255;

export function validateTagValue(value: string): void {
  if ([...value].length > MAX_TAG_CODEPOINTS) {
    throw new Error(`Tag value exceeds ${MAX_TAG_CODEPOINTS} Unicode codepoints`);
  }
}

export type ChangesetProvenance = {
  createdBy: string;
  comment: string;
  source: string;
};

export function assertProvenance(p: ChangesetProvenance): void {
  if (!p.createdBy.startsWith('Mapkeeper')) {
    throw new Error('created_by must start with Mapkeeper');
  }
  if (!p.comment.trim()) throw new Error('comment is required and user-editable');
  if (p.source.toLowerCase() === 'google') {
    throw new Error('source must never be Google');
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function createChangeset(
  accessToken: string,
  provenance: ChangesetProvenance,
): Promise<number> {
  assertProvenance(provenance);
  const caps = await fetchCapabilities();
  assertWritable(caps);
  const base = getOsmApiBase();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<osm>
  <changeset>
    <tag k="created_by" v="${escapeXml(provenance.createdBy)}"/>
    <tag k="comment" v="${escapeXml(provenance.comment)}"/>
    <tag k="source" v="${escapeXml(provenance.source)}"/>
  </changeset>
</osm>`;
  const res = await fetch(`${base}/api/0.6/changeset/create`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/xml',
    },
    body: xml,
  });
  if (!res.ok) throw new Error(`changeset/create failed: ${res.status}`);
  const id = Number(await res.text());
  if (!Number.isFinite(id)) throw new Error('Invalid changeset id');
  return id;
}

export type OsmChangeNode = {
  action: 'create' | 'modify';
  id: number;
  version?: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

export function buildOsmChange(changesetId: number, nodes: OsmChangeNode[]): string {
  const parts = nodes.map((n) => {
    Object.values(n.tags).forEach(validateTagValue);
    const versionAttr = n.action === 'modify' ? ` version="${n.version}"` : '';
    const idAttr = n.action === 'create' ? ` id="${n.id}"` : ` id="${n.id}"${versionAttr}`;
    const tags = Object.entries(n.tags)
      .map(([k, v]) => `<tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`)
      .join('');
    return `<node ${idAttr} changeset="${changesetId}" lat="${n.lat}" lon="${n.lon}">${tags}</node>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Mapkeeper">
  <${nodes[0]?.action ?? 'modify'}>
    ${parts.join('\n')}
  </${nodes[0]?.action ?? 'modify'}>
</osmChange>`;
}

function tagsXml(tags: Record<string, string>): string {
  Object.values(tags).forEach(validateTagValue);
  return Object.entries(tags)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `<tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`)
    .join('');
}

/** Tag-only modify OsmChange for node / way / relation (geometry/members preserved). */
export function buildTagModifyOsmChange(
  changesetId: number,
  el: OsmElement,
  tags: Record<string, string>,
): string {
  if (el.version == null) throw new Error('Element version required for modify');
  const tagXml = tagsXml(tags);
  let body: string;
  if (el.type === 'node') {
    if (el.lat == null || el.lon == null) throw new Error('Node lat/lon required');
    body = `<node id="${el.id}" version="${el.version}" changeset="${changesetId}" lat="${el.lat}" lon="${el.lon}">${tagXml}</node>`;
  } else if (el.type === 'way') {
    if (!el.nodes?.length) throw new Error('Way node list required for modify');
    const nd = el.nodes.map((n) => `<nd ref="${n}"/>`).join('');
    body = `<way id="${el.id}" version="${el.version}" changeset="${changesetId}">${nd}${tagXml}</way>`;
  } else {
    if (!el.members?.length) throw new Error('Relation members required for modify');
    const members = el.members
      .map(
        (m) =>
          `<member type="${escapeXml(m.type)}" ref="${m.ref}" role="${escapeXml(m.role ?? '')}"/>`,
      )
      .join('');
    body = `<relation id="${el.id}" version="${el.version}" changeset="${changesetId}">${members}${tagXml}</relation>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="Mapkeeper">
  <modify>
    ${body}
  </modify>
</osmChange>`;
}

export type PublishTagsResult =
  | { conflict: true; changesetId: number; remote: OsmElement | null }
  | {
      conflict: false;
      changesetId: number;
      newVersion: number;
      osmType: 'node' | 'way' | 'relation';
      osmId: number;
    };

/**
 * Update tags on an existing OSM object under the user's token.
 * Merges `tags` over the live element; empty string removes a key.
 */
export async function publishElementTags(params: {
  accessToken: string;
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  tags: Record<string, string>;
  comment: string;
  source: string;
  expectedVersion?: number;
}): Promise<PublishTagsResult> {
  const live = await fetchElement(params.osmType, params.osmId, params.accessToken);
  if (!live || live.visible === false) {
    throw new Error('OSM object not found or deleted on the configured map host');
  }
  if (
    params.expectedVersion != null &&
    live.version != null &&
    params.expectedVersion !== live.version
  ) {
    return { conflict: true, changesetId: 0, remote: live };
  }

  const merged: Record<string, string> = { ...(live.tags ?? {}) };
  for (const [k, v] of Object.entries(params.tags)) {
    if (v === '') delete merged[k];
    else merged[k] = v;
  }

  const changesetId = await createChangeset(params.accessToken, {
    createdBy: 'Mapkeeper 0.1.0',
    comment: params.comment,
    source: params.source,
  });
  const xml = buildTagModifyOsmChange(changesetId, live, merged);
  const res = await uploadOsmChange(params.accessToken, changesetId, xml);
  if (isConflictStatus(res.status)) {
    const remote = await fetchElement(params.osmType, params.osmId, params.accessToken);
    return { conflict: true, changesetId, remote };
  }
  if (!res.ok) {
    await closeChangeset(params.accessToken, changesetId).catch(() => undefined);
    const errBody = await res.text().catch(() => '');
    throw new Error(`upload failed: ${res.status}${errBody ? ` ${errBody.slice(0, 200)}` : ''}`);
  }
  const body = await res.text();
  const versions = parseDiffResultVersions(body);
  const hit = versions.find((v) => v.type === params.osmType && v.oldId === params.osmId);
  await closeChangeset(params.accessToken, changesetId);
  return {
    conflict: false,
    changesetId,
    newVersion: hit?.newVersion ?? (live.version ?? 0) + 1,
    osmType: params.osmType,
    osmId: hit?.newId ?? params.osmId,
  };
}

export async function uploadOsmChange(
  accessToken: string,
  changesetId: number,
  osmChangeXml: string,
): Promise<Response> {
  if (/<error[\s>]/i.test(osmChangeXml)) {
    throw new Error('Refusing to upload document containing error element');
  }
  const base = getOsmApiBase();
  return fetch(`${base}/api/0.6/changeset/${changesetId}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/xml',
    },
    body: osmChangeXml,
  });
}

export async function closeChangeset(accessToken: string, changesetId: number): Promise<void> {
  const base = getOsmApiBase();
  const res = await fetch(`${base}/api/0.6/changeset/${changesetId}/close`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`changeset/close failed: ${res.status}`);
  }
}

/** Parse new versions from diffResult; never assume version+1. */
export function parseDiffResultVersions(
  xml: string,
): Array<{ type: string; oldId: number; newId: number; newVersion: number }> {
  if (/<error[\s>]/i.test(xml)) {
    throw new Error('OSM returned HTTP body with embedded <error>; discard');
  }
  const out: Array<{ type: string; oldId: number; newId: number; newVersion: number }> = [];
  const re = /<(node|way|relation)\s+old_id="(-?\d+)"\s+new_id="(\d+)"\s+new_version="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({
      type: m[1]!,
      oldId: Number(m[2]),
      newId: Number(m[3]),
      newVersion: Number(m[4]),
    });
  }
  return out;
}
