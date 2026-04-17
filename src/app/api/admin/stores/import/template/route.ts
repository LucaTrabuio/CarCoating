import { NextResponse } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { V3_CSV_COLUMNS } from '@/lib/v3-types';
import { toCsv } from '@/lib/csv-import';

/**
 * Returns a CSV pre-filled with the current state of every store the user
 * can manage. Staff edit this in Excel and re-upload via POST /import.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const db = getAdminDb();
  const snap = await db.collection('stores').get();
  const rows = snap.docs
    .map((d) => ({ ...d.data(), store_id: d.id }))
    .filter((s) => canManageStore(user, s.store_id as string));

  const csv = toCsv(rows as Record<string, unknown>[], V3_CSV_COLUMNS as unknown as string[]);
  // UTF-8 BOM so Excel detects encoding correctly when opening the CSV
  const body = '\uFEFF' + csv;
  const filename = `stores-template-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
