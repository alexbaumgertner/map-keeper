import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { defaultSession, sessionOptions, type SessionData } from './session';

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions());
  if (!session.isLoggedIn) {
    Object.assign(session, defaultSession);
  }
  return session;
}
