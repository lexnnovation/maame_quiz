import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth';
import { listQuestions, addQuestion } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;
  return NextResponse.json({ questions: listQuestions() });
}

export async function POST(req) {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  const options = Array.isArray(body.options) ? body.options.map((o) => String(o || '').trim()) : [];
  const correctIndex = Number.isInteger(body.correctIndex) ? body.correctIndex : -1;

  if (!text || options.length !== 4 || options.some((o) => !o)) {
    return NextResponse.json({ error: 'Question text and all four options are required.' }, { status: 400 });
  }
  if (correctIndex < 0 || correctIndex > 3) {
    return NextResponse.json({ error: 'Pick which option is correct.' }, { status: 400 });
  }

  const id = addQuestion({ text, options, correctIndex });
  return NextResponse.json({ id });
}
