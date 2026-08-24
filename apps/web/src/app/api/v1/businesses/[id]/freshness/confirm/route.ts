import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { requireOwnedPlace } from '@/lib/places/http';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(session, id);
  if ('error' in result) return result.error;
  return NextResponse.json({ ok: true, lastFreshnessAt: new Date().toISOString() });
}
