import { NextResponse } from 'next/server';
import { forbidden, unauthorized } from '@/lib/api/errors';
import { lookupOwnedPlace, type PlaceAccess, type WatchedPlace } from '@/lib/places/store';
import type { SessionData } from '@/lib/auth/session';

export function placeAccessError(access: Extract<PlaceAccess, { ok: false }>, forbiddenMessage?: string) {
  if (access.status === 403) return forbidden(forbiddenMessage);
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function requireOwnedPlace(
  session: SessionData,
  id: string,
  forbiddenMessage?: string,
): Promise<{ place: WatchedPlace } | { error: NextResponse }> {
  if (!session.isLoggedIn || !session.userId) return { error: unauthorized() };
  const access = await lookupOwnedPlace(session.userId, id);
  if (!access.ok) return { error: placeAccessError(access, forbiddenMessage) };
  return { place: access.place };
}
