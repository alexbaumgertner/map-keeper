import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;

  if (isMemoryDbMode()) {
    const b = getMemoryStore().businesses.get(id);
    if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (b.ownerUserId !== session.userId) return forbidden('Not the claim owner');
    return NextResponse.json(b);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
