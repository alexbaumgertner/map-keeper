import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertNotProhibited } from '@mapkeeper/tagging';
import { getSession } from '@/lib/auth/get-session';
import { unprocessable } from '@/lib/api/errors';
import { requireOwnedPlace } from '@/lib/places/http';

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
  const { id } = await ctx.params;
  const owned = await requireOwnedPlace(session, id);
  if ('error' in owned) return owned.error;

  const body = schema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  try {
    for (const f of body.data.fields) assertNotProhibited(f.source);
  } catch (e) {
    return unprocessable(e instanceof Error ? e.message : 'prohibited source');
  }

  return NextResponse.json({ confirmed: body.data.fields.length });
}
