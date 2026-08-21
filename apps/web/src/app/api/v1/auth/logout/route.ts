import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { defaultSession } from '@/lib/auth/session';

export async function POST() {
  const session = await getSession();
  Object.assign(session, defaultSession);
  session.isLoggedIn = false;
  await session.save();
  return new NextResponse(null, { status: 204 });
}
