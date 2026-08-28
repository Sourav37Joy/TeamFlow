import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'teamflow_session';
const SECRET = process.env.SESSION_SECRET ?? 'change-me-in-production';

// A signed cookie carrying the user id. One email-and-password form does not earn a
// Passport strategy or a session store (Constitution VII).
export function signSession(userId: string): string {
  const signature = createHmac('sha256', SECRET).update(userId).digest('base64url');
  return `${userId}.${signature}`;
}

export function readSession(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const separator = cookie.lastIndexOf('.');
  if (separator <= 0) return null;
  const userId = cookie.slice(0, separator);
  const provided = cookie.slice(separator + 1);
  const expected = createHmac('sha256', SECRET).update(userId).digest('base64url');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}
