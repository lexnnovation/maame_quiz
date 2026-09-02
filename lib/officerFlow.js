import { getQuestionById } from './db';
import { optionOrderFor } from './quiz';

// An officer's `order` array stores question IDs (not positions), so it
// stays valid even if questions are added/removed later. If a question in
// an in-flight order gets deleted by an admin mid-test, skip over it.
export function skipDeletedQuestions(officer) {
  while (officer.currentIndex < officer.order.length && !getQuestionById(officer.order[officer.currentIndex])) {
    officer.currentIndex += 1;
  }
}

export function isFinished(officer) {
  return officer.currentIndex >= officer.order.length;
}

export function finishOfficer(officer) {
  let score = 0;
  for (const qId of officer.order) {
    const q = getQuestionById(qId);
    if (q && officer.answers[qId] === q.correctIndex) score++;
  }
  officer.score = score;
  officer.totalQuestions = officer.order.length;
  officer.status = 'submitted';
  officer.submittedAt = new Date().toISOString();
}

// Never includes the correct answer - only shuffled option text.
export function questionPayload(officer) {
  const qId = officer.order[officer.currentIndex];
  const q = getQuestionById(qId);
  const optOrder = optionOrderFor(officer.code, qId, q.options.length);
  const options = optOrder.map((origIdx, shownIdx) => ({
    letter: String.fromCharCode(65 + shownIdx),
    origIdx,
    text: q.options[origIdx],
  }));
  return {
    index: officer.currentIndex,
    total: officer.order.length,
    text: q.text,
    options,
  };
}

export function officerEvents(officers) {
  const ev = [];
  officers.forEach((o) => {
    if (o.openedAt) ev.push({ t: o.openedAt, tag: 'opened', code: o.code, name: o.name });
    if (o.submittedAt) ev.push({ t: o.submittedAt, tag: 'submitted', code: o.code, name: o.name });
    (o.reopens || []).forEach((t) => ev.push({ t, tag: 'reopen', code: o.code, name: o.name }));
    (o.reuseAttempts || []).forEach((t) => ev.push({ t, tag: 'reuse_attempt', code: o.code, name: o.name }));
  });
  ev.sort((a, b) => new Date(b.t) - new Date(a.t));
  return ev;
}
