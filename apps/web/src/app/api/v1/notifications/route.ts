import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized } from '@/lib/api/errors';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) return unauthorized();

  const items = [];
  if (!session.emailUsable) {
    items.push({
      kind: 'email_unavailable',
      status: 'skipped_no_email',
      message:
        'No usable OpenStreetMap account email. Digests are paused until email is available on your OSM account.',
    });
  }

  return NextResponse.json({ notifications: items });
}
