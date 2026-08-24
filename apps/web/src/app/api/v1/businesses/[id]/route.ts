import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { serviceUnavailable } from '@/lib/api/errors';
import { parseDraftBody } from '@/lib/places/draft-body';
import { requireOwnedPlace } from '@/lib/places/http';
import { patchDraftPlace } from '@/lib/places/store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const result = await requireOwnedPlace(session, id, 'Not the claim owner');
  if ('error' in result) return result.error;
  return NextResponse.json(result.place);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  const { id } = await ctx.params;
  const owned = await requireOwnedPlace(session, id, 'Not the claim owner');
  if ('error' in owned) return owned.error;

  const parsed = parseDraftBody(await req.json());
  if (!parsed.ok) return parsed.error;

  try {
    // externalPageUrl write-only — never fetched
    const result = await patchDraftPlace(session.userId!, id, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: result.status });
    }
    return NextResponse.json(result.place);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update draft';
    return serviceUnavailable(message);
  }
}
