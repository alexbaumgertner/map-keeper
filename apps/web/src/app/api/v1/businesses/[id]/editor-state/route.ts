import { NextRequest, NextResponse } from 'next/server';
import { fieldsForVertical } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { requireOwnedPlace } from '@/lib/places/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(
    session,
    id,
    'Editor is only available for places you have claimed',
  );
  if ('error' in result) return result.error;
  const b = result.place;

  return NextResponse.json({
    business: b,
    fields: fieldsForVertical(b.vertical),
    flags: {
      missing: ['name', 'opening_hours'].filter((k) => !(b.fingerprint as Record<string, string> | undefined)?.[k]),
      stale: [],
    },
    candidates: [],
  });
}
