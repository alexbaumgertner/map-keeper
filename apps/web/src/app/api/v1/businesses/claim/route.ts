import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchElement } from '@mapkeeper/osm';
import { buildFingerprint } from '@mapkeeper/matching';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

const claimSchema = z.object({
  osmType: z.enum(['node', 'way', 'relation']),
  osmId: z.number().int().positive(),
  vertical: z.enum(['food_drink', 'accommodation', 'other']).default('other'),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();

  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) return unprocessable(parsed.error.message);

  const el = await fetchElement(parsed.data.osmType, parsed.data.osmId, session.accessToken);
  if (!el) return unprocessable('OSM object not found');

  const tags = el.tags ?? {};
  const fingerprint = buildFingerprint(tags);
  const id = crypto.randomUUID();
  const record = {
    id,
    ownerUserId: session.userId,
    vertical: parsed.data.vertical,
    status: 'published',
    displayName: tags.name ?? `${parsed.data.osmType}/${parsed.data.osmId}`,
    osmType: parsed.data.osmType,
    osmId: parsed.data.osmId,
    osmVersion: el.version,
    lat: el.lat,
    lon: el.lon,
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
}
