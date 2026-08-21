import { NextRequest, NextResponse } from 'next/server';
import { fieldsForVertical } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, forbidden } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();
  const { id } = await ctx.params;

  const b = isMemoryDbMode() ? getMemoryStore().businesses.get(id) : undefined;
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.ownerUserId !== session.userId) {
    return forbidden('Editor is only available for places you have claimed');
  }

  return NextResponse.json({
    business: b,
    fields: fieldsForVertical(b.vertical),
    flags: {
      missing: ['name', 'opening_hours'].filter((k) => !(b.fingerprint as Record<string, string>)?.[k]),
      stale: [],
    },
    candidates: [],
  });
}
