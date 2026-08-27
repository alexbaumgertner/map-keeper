import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveElementForClaim } from '@mapkeeper/osm';
import { buildFingerprint } from '@mapkeeper/matching';
import { getSession } from '@/lib/auth/get-session';
import { serviceUnavailable, unauthorized, unprocessable } from '@/lib/api/errors';
import { isMemoryDbMode } from '@/lib/db';
import { createClaimedPlace, persistSessionUser } from '@/lib/places/store';

const claimSchema = z.object({
  osmType: z.enum(['node', 'way', 'relation']),
  osmId: z.number().int().positive(),
  vertical: z.enum(['food_drink', 'accommodation', 'other']).default('other'),
  name: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  tags: z.record(z.string()).optional(),
  resolveMode: z.enum(['editing_host', 'default']).default('default'),
});

const CLAIM_NOTE =
  'Claim is an internal watch link only. It confers no ownership or exclusivity on OpenStreetMap.';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.osmUserId) return unauthorized();
  if (process.env.VERCEL && isMemoryDbMode()) {
    return serviceUnavailable('DATABASE_URL is not configured');
  }

  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) return unprocessable(parsed.error.message);

  try {
    const ownerUserId = await persistSessionUser(session, {
      osmUserId: session.osmUserId,
      displayName: session.displayName ?? 'OSM user',
      emailUsable: session.emailUsable ?? false,
      accessToken: session.accessToken,
    });
    await session.save();

    const el = await resolveElementForClaim({
      osmType: parsed.data.osmType,
      osmId: parsed.data.osmId,
      accessToken: session.accessToken,
      resolveMode: parsed.data.resolveMode,
      fallback:
        parsed.data.resolveMode === 'default'
          ? {
              name: parsed.data.name,
              lat: parsed.data.lat,
              lon: parsed.data.lon,
              tags: parsed.data.tags,
            }
          : undefined,
    });

    if (!el) {
      return unprocessable('OSM object not found on the configured map host');
    }

    const tags = el.tags ?? {};
    const { place: saved, alreadyWatched } = await createClaimedPlace(ownerUserId, {
      vertical: parsed.data.vertical,
      displayName: tags.name || parsed.data.name || `${parsed.data.osmType}/${parsed.data.osmId}`,
      osmType: parsed.data.osmType,
      osmId: parsed.data.osmId,
      osmVersion: el.version,
      lat: el.lat ?? parsed.data.lat,
      lon: el.lon ?? parsed.data.lon,
      fingerprint: buildFingerprint(tags),
    });

    return NextResponse.json(
      {
        ...saved,
        alreadyWatched,
        claimNote: CLAIM_NOTE,
      },
      { status: alreadyWatched ? 200 : 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claim failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
