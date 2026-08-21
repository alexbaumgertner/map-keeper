import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;
  const b = isMemoryDbMode() ? getMemoryStore().businesses.get(id) : undefined;
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.ownerUserId !== session.userId) return forbidden();
  return NextResponse.json({ ok: true, lastFreshnessAt: new Date().toISOString() });
}
