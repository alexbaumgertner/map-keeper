import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { serviceUnavailable, unauthorized } from '@/lib/api/errors';
import { isMemoryDbMode } from '@/lib/db';
import { parseDraftBody } from '@/lib/places/draft-body';
import { createDraftPlace, listOwnedPlaces, persistSessionUser } from '@/lib/places/store';

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

  const parsed = parseDraftBody(await req.json());
  if (!parsed.ok) return parsed.error;

  try {
    // externalPageUrl is stored as text only — never fetched/scraped
    const record = await createDraftPlace(auth.session.userId!, parsed.data);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create draft';
    return serviceUnavailable(message);
  }
}
