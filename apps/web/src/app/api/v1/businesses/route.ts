import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { unauthorized, unprocessable } from '@/lib/api/errors';
import { getMemoryStore, isMemoryDbMode } from '@/lib/db';

const createSchema = z.object({
  vertical: z.enum(['food_drink', 'accommodation', 'other']).default('other'),
  displayName: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
});

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();

  if (isMemoryDbMode()) {
    const list = [...getMemoryStore().businesses.values()].filter(
      (b) => b.ownerUserId === session.userId,
    );
    return NextResponse.json({ businesses: list });
  }

  return NextResponse.json({
    businesses: [],
    warning: 'DATABASE_URL not set; using empty list',
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return unauthorized();

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return unprocessable(body.error.message);

  const id = crypto.randomUUID();
  const record = {
    id,
    ownerUserId: session.userId,
    vertical: body.data.vertical,
    status: 'draft',
    displayName: body.data.displayName,
    lat: body.data.lat,
    lon: body.data.lon,
    linkStatus: 'draft' as const,
  };

  if (isMemoryDbMode()) {
    getMemoryStore().businesses.set(id, record);
  }

  return NextResponse.json(record, { status: 201 });
}
