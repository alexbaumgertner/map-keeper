import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

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
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;
  const mem = isMemoryDbMode() ? getMemoryStore() : null;
  const b = mem?.businesses.get(id);
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.ownerUserId !== session.userId) return forbidden();

  const body = schema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  b.osmType = body.data.osmType;
  b.osmId = body.data.osmId;
  b.osmVersion = body.data.osmVersion;
  b.status = 'published';
  b.linkStatus = 'active';
  mem?.businesses.set(id, b);

  return NextResponse.json({ ok: true, business: b });
}
