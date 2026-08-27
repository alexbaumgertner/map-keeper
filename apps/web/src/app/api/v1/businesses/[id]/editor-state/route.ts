import { NextRequest, NextResponse } from 'next/server';
import { fieldsForVertical } from '@mapkeeper/tagging';
import { fetchElement } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { requireOwnedPlace } from '@/lib/places/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(
    session,
    id,
    'Editor is only available for places you have claimed',
  );
  if ('error' in result) return result.error;
  const b = result.place;

  let osmTags: Record<string, string> = {};
  let osmVersion = b.osmVersion ?? null;
  let osmFetchError: string | null = null;

  if (b.osmType && b.osmId && (b.osmType === 'node' || b.osmType === 'way' || b.osmType === 'relation')) {
    try {
      const el = await fetchElement(b.osmType, b.osmId, session.accessToken);
      if (!el || el.visible === false) {
        osmFetchError = 'OSM object not found or deleted on the configured map host';
      } else {
        osmTags = el.tags ?? {};
        osmVersion = el.version ?? osmVersion;
      }
    } catch (err) {
      osmFetchError = err instanceof Error ? err.message : 'Failed to load OSM object';
    }
  }

  const formFields = fieldsForVertical(b.vertical);
  const values: Record<string, string> = {};
  for (const f of formFields) {
    values[f.key] = osmTags[f.key] ?? (f.key === 'name' ? b.displayName : '') ?? '';
  }
  // Keep extra OSM tags visible for edit when present
  for (const [k, v] of Object.entries(osmTags)) {
    if (values[k] === undefined) values[k] = v;
  }

  return NextResponse.json({
    business: b,
    fields: formFields,
    values,
    osm: {
      type: b.osmType ?? null,
      id: b.osmId ?? null,
      version: osmVersion,
      tags: osmTags,
      fetchError: osmFetchError,
    },
    flags: {
      missing: formFields.map((f) => f.key).filter((k) => !values[k]),
      stale: [],
    },
    candidates: [],
    defaultComment: `Update ${b.displayName} via Mapkeeper — https://wiki.openstreetmap.org/wiki/Mapkeeper`,
  });
}
