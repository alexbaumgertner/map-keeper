import { NextRequest, NextResponse } from 'next/server';
import {
  OsmIdentityParseError,
  fetchElement,
  isOsmObjectType,
  parseOsmIdentity,
  type OsmObjectType,
} from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

function previewTags(tags?: Record<string, string>): Record<string, string> | null {
  if (!tags) return null;
  const keep = ['name', 'name:en', 'shop', 'amenity', 'tourism', 'building'];
  const out: Record<string, string> = {};
  for (const k of keep) {
    if (tags[k]) out[k] = tags[k]!;
  }
  return Object.keys(out).length ? out : tags;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return unauthorized();

  const q = req.nextUrl.searchParams.get('q')?.trim();
  const typeParam = req.nextUrl.searchParams.get('osmType');
  const idParam = req.nextUrl.searchParams.get('osmId');

  let osmType: OsmObjectType;
  let osmId: number;

  if (typeParam && idParam) {
    if (!isOsmObjectType(typeParam)) {
      return unprocessable('osmType must be node, way, or relation');
    }
    const id = Number(idParam);
    if (!Number.isSafeInteger(id) || id < 1) {
      return unprocessable('osmId must be a positive integer');
    }
    osmType = typeParam;
    osmId = id;
  } else if (q) {
    try {
      const parsed = parseOsmIdentity(q);
      osmType = parsed.osmType;
      osmId = parsed.osmId;
    } catch (err) {
      const message = err instanceof OsmIdentityParseError ? err.message : 'Invalid identity';
      return unprocessable(message);
    }
  } else {
    return unprocessable('Provide osmType and osmId, or q (type/id or OSM object URL)');
  }

  try {
    const el = await fetchElement(osmType, osmId, session.accessToken);
    if (!el) {
      return unprocessable('OSM object not found on the configured map host');
    }
    const tags = el.tags ?? {};
    return NextResponse.json({
      osmType: el.type,
      osmId: el.id,
      displayName: tags.name || tags['name:en'] || null,
      lat: el.lat ?? null,
      lon: el.lon ?? null,
      version: el.version ?? null,
      tags: previewTags(tags),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Look-up failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
