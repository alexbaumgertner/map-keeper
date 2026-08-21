import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseLocalBusinessJsonLd, assertNotProhibited } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;
  const b = isMemoryDbMode() ? getMemoryStore().businesses.get(id) : undefined;
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.ownerUserId !== session.userId) return forbidden();

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
