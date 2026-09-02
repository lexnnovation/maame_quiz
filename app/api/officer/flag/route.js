import { NextResponse } from 'next/server';
import { getOfficer, saveOfficer } from '@/lib/db';

export const runtime = 'nodejs';

// Best-effort integrity beacon (tab-switch/blur during a live test). Always
// resolves 200 so it never surfaces a console error to the officer.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const officer = getOfficer(code);
  if (!officer || officer.status !== 'in_progress') {
    return NextResponse.json({ ok: false });
  }
  officer.tabSwitches = (officer.tabSwitches || 0) + 1;
  saveOfficer(officer);
  return NextResponse.json({ ok: true });
}
