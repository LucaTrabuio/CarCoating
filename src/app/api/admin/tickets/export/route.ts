import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const snap = await db.collection('tickets').get();

  const fields = ['id', 'subject', 'authorEmail', 'storeId', 'status', 'createdAt', 'messageCount'];
  const rows: string[] = [fields.join(',')];

  for (const doc of snap.docs) {
    const d = doc.data();
    const msgs = Array.isArray(d.messages) ? d.messages.length : 0;
    rows.push([
      doc.id,
      `"${(d.subject || '').replace(/"/g, '""')}"`,
      d.authorEmail || '',
      d.storeId || '',
      d.status || '',
      d.createdAt || '',
      String(msgs),
    ].join(','));
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tickets-export.csv"',
    },
  });
}
