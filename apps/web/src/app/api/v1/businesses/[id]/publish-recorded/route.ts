import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { unprocessable } from '@/lib/api/errors';
import { requireOwnedPlace } from '@/lib/places/http';
import { recordPlacePublish } from '@/lib/places/store';

const schema = z.object({
  osmType: z.enum(['node', 'way', 'relation']),
  osmId: z.number(),
  osmVersion: z.number(),
  changesetId: z.number(),
  tagsWritten: z.record(z.string()),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const owned = await requireOwnedPlace(session, id);
  if ('error' in owned) return owned.error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  const access = await recordPlacePublish(session.userId!, id, {
    osmType: body.data.osmType,
    osmId: body.data.osmId,
    osmVersion: body.data.osmVersion,
  });
  if (!access.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, business: access.place });
}
