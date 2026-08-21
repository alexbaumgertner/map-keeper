import { SessionOptions } from 'iron-session';

export type SessionData = {
  userId?: string;
  osmUserId?: number;
  displayName?: string;
  accessToken?: string;
  emailUsable?: boolean;
  isLoggedIn: boolean;
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    // Dev fallback — replace in production
    return {
      password: 'complex_password_at_least_32_characters_long',
      cookieName: 'mapkeeper_session',
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    };
  }
  return {
    password,
    cookieName: 'mapkeeper_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  };
}
