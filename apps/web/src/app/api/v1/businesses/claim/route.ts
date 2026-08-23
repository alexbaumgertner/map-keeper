import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchElement, fetchPublicElement } from '@mapkeeper/osm';
import { buildFingerprint } from '@mapkeeper/matching';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

const claimSchema = z.object({
  osmType: z.enum(['node', 'way', 'relation']),
  osmId: z.number().int().positive(),
  vertical: z.enum(['food_drink', 'accommodation', 'other']).default('other'),
  name: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  tags: z.record(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();

  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) return unprocessable(parsed.error.message);

  try {
    // Prefer sandbox object; Overpass IDs are usually on the public map, not the OSM dev API.
    let el =
      (await fetchElement(parsed.data.osmType, parsed.data.osmId, session.accessToken)) ??
      (await fetchPublicElement(parsed.data.osmType, parsed.data.osmId));

    if (!el) {
      if (parsed.data.name || parsed.data.lat != null) {
        el = {
          type: parsed.data.osmType,
          id: parsed.data.osmId,
          lat: parsed.data.lat,
          lon: parsed.data.lon,
          tags: { name: parsed.data.name ?? '', ...parsed.data.tags },
        };
      } else {
        return unprocessable('OSM object not found');
      }
    }

    const tags = el.tags ?? {};
    const fingerprint = buildFingerprint(tags);
    const id = crypto.randomUUID();
    const record = {
      id,
      ownerUserId: session.userId,
      vertical: parsed.data.vertical,
      status: 'published',
      displayName: tags.name || parsed.data.name || `${parsed.data.osmType}/${parsed.data.osmId}`,
      osmType: parsed.data.osmType,
      osmId: parsed.data.osmId,
      osmVersion: el.version,
      lat: el.lat ?? parsed.data.lat,
      lon: el.lon ?? parsed.data.lon,
      fingerprint,
      linkStatus: 'active' as const,
    };

    if (isMemoryDbMode()) {
      getMemoryStore().businesses.set(id, record);
    }

    return NextResponse.json(
      {
        ...record,
        claimNote:
          'Claim is an internal watch link only. It confers no ownership or exclusivity on OpenStreetMap.',
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claim failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
