import { adminGuard } from '@/lib/auth';
import { listOfficers } from '@/lib/db';

export const runtime = 'nodejs';

function csvCell(v) {
  return '"' + String(v).replace(/"/g, '""') + '"';
}

export async function GET() {
  const unauthorized = await adminGuard();
  if (unauthorized) return unauthorized;

  const officers = listOfficers();
  const header = 'Code,Name,Status,Opened,Submitted,Score,Total,TabSwitches,Reopens,BlockedReuse\n';
  const rows = officers
    .map((o) =>
      [
        o.code,
        o.name,
        o.status,
        o.openedAt || '',
        o.submittedAt || '',
        o.score ?? '',
        o.totalQuestions ?? '',
        o.tabSwitches || 0,
        (o.reopens || []).length,
        (o.reuseAttempts || []).length,
      ]
        .map(csvCell)
        .join(',')
    )
    .join('\n');

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="test-results.csv"',
    },
  });
}
