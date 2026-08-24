import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { requireOwnedPlace } from '@/lib/places/http';

const OVERTURE_CONFIDENCE_GATE = 0.8;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(session, id);
  if ('error' in result) return result.error;

  return NextResponse.json({
    candidates: [],
    gate: OVERTURE_CONFIDENCE_GATE,
    note: 'Overture fetch wired when dataset access configured; candidates stay unconfirmed',
  });
}
