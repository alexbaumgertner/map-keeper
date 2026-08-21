import { assertWritable, fetchCapabilities } from './capabilities';
import { getOsmApiBase } from './oauth';

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
  // 409 = already closed — OK
  if (!res.ok && res.status !== 409) {
    throw new Error(`changeset/close failed: ${res.status}`);
  }
}

/** Parse new versions from diffResult; never assume version+1. */
export function parseDiffResultVersions(xml: string): Array<{ type: string; oldId: number; newId: number; newVersion: number }> {
  if (/<error[\s>]/i.test(xml)) {
    throw new Error('OSM returned HTTP body with embedded <error>; discard');
  }
  const out: Array<{ type: string; oldId: number; newId: number; newVersion: number }> = [];
  const re = /<(node|way|relation)\s+old_id="(-?\d+)"\s+new_id="(\d+)"\s+new_version="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({
      type: m[1],
      oldId: Number(m[2]),
      newId: Number(m[3]),
      newVersion: Number(m[4]),
    });
  }
  return out;
}
