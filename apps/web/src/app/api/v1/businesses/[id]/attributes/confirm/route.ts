import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertNotProhibited } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

const schema = z.object({
  fields: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      source: z.string(),
    }),
  ),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;
  const b = isMemoryDbMode() ? getMemoryStore().businesses.get(id) : undefined;
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.ownerUserId !== session.userId) return forbidden();

  const body = schema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  try {
    for (const f of body.data.fields) assertNotProhibited(f.source);
  } catch (e) {
    return unprocessable(e instanceof Error ? e.message : 'prohibited source');
  }

  return NextResponse.json({ confirmed: body.data.fields.length });
}
