import { NextRequest, NextResponse } from 'next/server';
import { searchVenues } from '@mapkeeper/osm';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';

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

  const results = await searchVenues({ q, lat, lon, radiusM, limit });
  return NextResponse.json({ results });
}
