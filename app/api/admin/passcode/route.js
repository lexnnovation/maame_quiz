import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminGuard } from '@/lib/auth';
import { setPasscodeHash } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const newPasscode = String(body.newPasscode || '');
  if (newPasscode.length < 6) {
    return NextResponse.json({ error: 'Passcode must be at least 6 characters.' }, { status: 400 });
  }

  setPasscodeHash(await bcrypt.hash(newPasscode, 10));
  return NextResponse.json({ ok: true });
}
