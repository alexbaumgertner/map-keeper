import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { requireOwnedPlace } from '@/lib/places/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(session, id, 'Not the claim owner');
  if ('error' in result) return result.error;
  return NextResponse.json(result.place);
}
