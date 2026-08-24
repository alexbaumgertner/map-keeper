import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { serviceUnavailable, unauthorized, unprocessable } from '@/lib/api/errors';
import { isMemoryDbMode } from '@/lib/db';
import { createDraftPlace, listOwnedPlaces, persistSessionUser } from '@/lib/places/store';

const createSchema = z.object({
  vertical: z.enum(['food_drink', 'accommodation', 'other']).default('other'),
  displayName: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
});

async function ensureUser() {
  const session = await getSession();
  if (!session.isLoggedIn) return { error: unauthorized() as NextResponse };
  if (process.env.VERCEL && isMemoryDbMode()) {
    return { error: serviceUnavailable('DATABASE_URL is not configured') };
  }
  if (session.osmUserId && session.displayName) {
    await persistSessionUser(session, {
      osmUserId: session.osmUserId,
      displayName: session.displayName,
      emailUsable: session.emailUsable ?? false,
      accessToken: session.accessToken,
    });
    await session.save();
  }
  if (!session.userId) return { error: unauthorized() };
  return { session };
}

export async function GET() {
  const auth = await ensureUser();
  if ('error' in auth) return auth.error;
  try {
    const businesses = await listOwnedPlaces(auth.session.userId!);
    return NextResponse.json({ businesses });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load watched places';
    return serviceUnavailable(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await ensureUser();
  if ('error' in auth) return auth.error;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  try {
    const record = await createDraftPlace(auth.session.userId!, body.data);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create draft';
    return serviceUnavailable(message);
  }
}
