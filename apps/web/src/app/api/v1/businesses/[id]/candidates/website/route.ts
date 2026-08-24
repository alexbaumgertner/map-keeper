import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseLocalBusinessJsonLd, assertNotProhibited } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { unprocessable } from '@/lib/api/errors';
import { requireOwnedPlace } from '@/lib/places/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const owned = await requireOwnedPlace(session, id);
  if ('error' in owned) return owned.error;

  const body = z.object({ url: z.string().url() }).safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  assertNotProhibited('website');
  const html = await fetch(body.data.url).then((r) => r.text());
  const parsed = parseLocalBusinessJsonLd(html);
  return NextResponse.json({
    candidate: {
      source: 'website',
      payload: parsed ?? {},
      status: 'proposed',
      note: 'Unconfirmed — confirm each field before publish',
    },
  });
}
