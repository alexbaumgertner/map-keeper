import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();

  let emailUsable = session.emailUsable ?? false;
  if (isMemoryDbMode() && session.userId) {
    emailUsable = getMemoryStore().users.get(session.userId)?.emailUsable ?? false;
  }

  return NextResponse.json({
    id: session.userId,
    osmUserId: session.osmUserId,
    displayName: session.displayName,
    emailUsable,
    isLoggedIn: true,
  });
}
