import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publishElementTags } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';
import { requireOwnedPlace } from '@/lib/places/http';
import { recordPlacePublish } from '@/lib/places/store';

const schema = z.object({
  tags: z.record(z.string()),
  comment: z.string().min(1).max(255),
  source: z.string().min(1).max(255).default('local knowledge'),
  confirmedPreview: z.literal(true),
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * Publish tag updates to the configured OSM editing host using the signed-in
 * user's OAuth token (never a shared bot). Browser cannot call OSM directly (CORS).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  if (!session.accessToken) {
    return unprocessable('Sign in again to refresh your OpenStreetMap token before publishing');
  }

  const { id } = await ctx.params;
  const owned = await requireOwnedPlace(
    session,
    id,
    'Editor is only available for places you have claimed',
  );
  if ('error' in owned) return owned.error;

  const place = owned.place;
  if (!place.osmType || !place.osmId) {
    return unprocessable('Place has no OpenStreetMap object to publish to (draft only)');
  }
  if (place.osmType !== 'node' && place.osmType !== 'way' && place.osmType !== 'relation') {
    return unprocessable('Unsupported OSM type');
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);
  if (body.data.source.toLowerCase() === 'google') {
    return unprocessable('source must never be Google');
  }
  if (!body.data.confirmedPreview) {
    return unprocessable('Diff preview confirmation is required before publish');
  }

  try {
    const result = await publishElementTags({
      accessToken: session.accessToken,
      osmType: place.osmType,
      osmId: place.osmId,
      tags: body.data.tags,
      comment: body.data.comment,
      source: body.data.source,
      expectedVersion: place.osmVersion,
    });

    if (result.conflict) {
      return NextResponse.json(
        {
          conflict: true,
          remote: result.remote,
          message: 'OpenStreetMap object changed since you loaded it. Resolve conflicts and try again.',
        },
        { status: 409 },
      );
    }

    const recorded = await recordPlacePublish(session.userId, id, {
      osmType: result.osmType,
      osmId: result.osmId,
      osmVersion: result.newVersion,
    });
    if (!recorded.ok) {
      return NextResponse.json(
        {
          ok: true,
          warning: 'Published to OpenStreetMap but failed to record locally',
          changesetId: result.changesetId,
          osmVersion: result.newVersion,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      changesetId: result.changesetId,
      osmVersion: result.newVersion,
      business: recorded.place,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
