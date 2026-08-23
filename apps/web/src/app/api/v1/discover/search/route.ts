import { NextRequest, NextResponse } from 'next/server';
import { searchVenues } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable, serviceUnavailable } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return unauthorized();

  const q = req.nextUrl.searchParams.get('q');
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lon = Number(req.nextUrl.searchParams.get('lon'));
  const radiusM = Number(req.nextUrl.searchParams.get('radius_m') ?? 2000);
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);

  if (!q || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return unprocessable('q, lat, lon are required');
  }

  try {
    const results = await searchVenues({ q, lat, lon, radiusM, limit });
    return NextResponse.json({ results });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Venue search failed';
    const busy = /504|503|429|timed out|aborted|fetch failed|Connect Timeout|UND_ERR_CONNECT_TIMEOUT/i.test(raw);
    return serviceUnavailable(
      busy
        ? 'OpenStreetMap search is busy. Wait a few seconds and try again.'
        : raw,
    );
  }
}
