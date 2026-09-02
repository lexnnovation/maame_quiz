import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth';
import { deleteQuestion } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(_req, { params }) {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;

  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid question id.' }, { status: 400 });

  deleteQuestion(id);
  return NextResponse.json({ ok: true });
}
