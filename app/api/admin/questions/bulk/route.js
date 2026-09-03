import { NextResponse } from 'next/server';
import { adminGuard } from '@/lib/auth';
import { addQuestionsBulk } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_ROWS = 1000;

export async function POST(req) {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.questions) ? body.questions : [];

  if (!rows.length) {
    return NextResponse.json({ error: 'No questions to import.' }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows — max ${MAX_ROWS} per import.` }, { status: 400 });
  }

  const valid = [];
  const errors = [];

  rows.forEach((row, i) => {
    const rowNum = Number.isInteger(row?.row) ? row.row : i + 1;
    const text = String(row?.text || '').trim();
    const options = Array.isArray(row?.options) ? row.options.map((o) => String(o || '').trim()) : [];
    const correctIndex = Number.isInteger(row?.correctIndex) ? row.correctIndex : -1;

    if (!text || options.length !== 4 || options.some((o) => !o)) {
      errors.push({ row: rowNum, error: 'Missing question text or one of the four options.' });
      return;
    }
    if (correctIndex < 0 || correctIndex > 3) {
      errors.push({ row: rowNum, error: 'Could not determine the correct answer.' });
      return;
    }
    valid.push({ text, options, correctIndex });
  });

  const insertedIds = valid.length ? addQuestionsBulk(valid) : [];

  return NextResponse.json({ inserted: insertedIds.length, errors });
}
