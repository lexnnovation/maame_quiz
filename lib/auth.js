import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Read lazily (not at module load) so `next build` can statically analyze
// route modules without real env vars present - this only needs to be set
// when a request actually comes in at runtime.
function sessionOptions() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET env var must be set to a random string of at least 32 characters (e.g. `openssl rand -base64 32`).'
    );
  }
  return {
    password: secret,
    cookieName: 'officer_portal_admin',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
    },
  };
}

export async function getAdminSession() {
  return getIronSession(await cookies(), sessionOptions());
}

export async function requireAdmin() {
  const session = await getAdminSession();
  return !!session.isAdmin;
}

// Returns null when authorized, otherwise a 401 NextResponse to return
// directly from the route handler.
export async function adminGuard() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
