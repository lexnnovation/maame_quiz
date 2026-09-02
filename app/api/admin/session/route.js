import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getAdminSession();
  const settings = getSettings();
  return NextResponse.json({
    authenticated: !!session.isAdmin,
    needsSetup: !settings.hasPasscode,
  });
}
