import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchOsmUser } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code) {
    return NextResponse.json({ error: 'missing code' }, { status: 400 });
  }
  const clientId = process.env.OSM_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.OSM_OAUTH_CLIENT_SECRET!;
  const redirectUri =
    process.env.OSM_OAUTH_REDIRECT_URI ?? 'http://127.0.0.1:3000/api/v1/auth/osm/callback';

  const token = await exchangeCode({ clientId, clientSecret, redirectUri, code });
  const osmUser = await fetchOsmUser(token.access_token);
  const email = osmUser.email?.trim();
  const emailUsable = Boolean(email);

  const session = await getSession();
  const userId = crypto.randomUUID();

  if (isMemoryDbMode()) {
    const mem = getMemoryStore();
    const existing = [...mem.users.values()].find((u) => u.osmUserId === osmUser.id);
    const id = existing?.id ?? userId;
    mem.users.set(id, {
      id,
      osmUserId: osmUser.id,
      displayName: osmUser.display_name,
      email,
      emailUsable,
      accessToken: token.access_token,
    });
    session.userId = id;
  } else {
    session.userId = userId;
  }

  session.osmUserId = osmUser.id;
  session.displayName = osmUser.display_name;
  session.accessToken = token.access_token;
  session.emailUsable = emailUsable;
  session.isLoggedIn = true;
  await session.save();

  let redirect = '/places';
  try {
    if (state) {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as { redirect?: string };
      if (parsed.redirect?.startsWith('/')) redirect = parsed.redirect;
    }
  } catch {
    /* ignore */
  }
  return NextResponse.redirect(new URL(redirect, req.nextUrl.origin));
}
