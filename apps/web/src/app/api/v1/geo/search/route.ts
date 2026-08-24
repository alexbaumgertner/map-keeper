import { NextRequest, NextResponse } from 'next/server';
import { serviceUnavailable, unprocessable } from '@/lib/api/errors';
import { searchPhoton } from '@/lib/geo/photon';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 5);
  if (!q) return unprocessable('q is required');

  try {
    const results = await searchPhoton(q, Number.isFinite(limit) ? limit : 5);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Geocode failed';
    return serviceUnavailable(
      /timeout|abort|fetch failed|503|429/i.test(message)
        ? 'Place search is busy. Try again or pan the map.'
        : message,
    );
  }
}
