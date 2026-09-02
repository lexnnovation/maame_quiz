import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminSession } from '@/lib/auth';
import { getSettings, getPasscodeHash, setPasscodeHash } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const limited = rateLimit('admin-login:' + clientKey(req), { limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const passcode = String(body.passcode || '');
  if (!passcode) return NextResponse.json({ error: 'Enter a passcode.' }, { status: 400 });

  const settings = getSettings();
  const session = await getAdminSession();

  if (!settings.hasPasscode) {
    if (passcode.length < 6) {
      return NextResponse.json({ error: 'Passcode must be at least 6 characters.' }, { status: 400 });
    }
    setPasscodeHash(await bcrypt.hash(passcode, 10));
    session.isAdmin = true;
    await session.save();
    return NextResponse.json({ ok: true });
  }

  const valid = await bcrypt.compare(passcode, getPasscodeHash());
  if (!valid) return NextResponse.json({ error: 'Incorrect passcode.' }, { status: 401 });

  session.isAdmin = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
