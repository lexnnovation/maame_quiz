import { NextResponse } from 'next/server';
import { getOfficer, saveOfficer, getSettings } from '@/lib/db';
import { skipDeletedQuestions, isFinished, finishOfficer, questionPayload } from '@/lib/officerFlow';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase();
  const officer = getOfficer(code);
  if (!officer) return NextResponse.json({ error: 'Code not recognized.' }, { status: 404 });
  if (officer.status !== 'in_progress') {
    return NextResponse.json({ error: 'This test is not currently in progress.' }, { status: 409 });
  }

  const settings = getSettings();
  skipDeletedQuestions(officer);
  if (isFinished(officer)) {
    finishOfficer(officer);
    saveOfficer(officer);
    return NextResponse.json({
      status: 'done',
      score: settings.showScoreToOfficer ? officer.score : null,
      totalQuestions: officer.totalQuestions,
    });
  }

  saveOfficer(officer);
  return NextResponse.json({
    status: 'question',
    secondsPerQuestion: settings.secondsPerQuestion,
    question: questionPayload(officer),
  });
}
