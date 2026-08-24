import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, MINIMAL_SCOPES } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';

/**
 * Starts OSM OAuth.
 * Query `redirect` — path after callback (e.g. `/places/new` for signed-out Add Business).
 * Sign Up, Login, and Add Business (signed out) all use this endpoint.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.OSM_OAUTH_CLIENT_ID;
  const redirectUri =
    process.env.OSM_OAUTH_REDIRECT_URI ?? 'http://127.0.0.1:3000/api/v1/auth/osm/callback';
  if (!clientId) {
    return NextResponse.json(
      {
        error: 'OSM_OAUTH_CLIENT_ID not configured',
        hint: 'Register an OAuth app on master.apis.dev.openstreetmap.org with redirect http://127.0.0.1:3000/api/v1/auth/osm/callback',
      },
      { status: 503 },
    );
  }
  const redirect = req.nextUrl.searchParams.get('redirect') ?? '/places';
  const state = Buffer.from(JSON.stringify({ redirect, n: crypto.randomUUID() })).toString('base64url');
  const session = await getSession();
  void session;
  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    scopes: [...MINIMAL_SCOPES],
  });
  return NextResponse.redirect(url);
}
