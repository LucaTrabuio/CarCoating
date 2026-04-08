import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const storeId = searchParams.get('storeId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  let query = db.collection('kpi').doc(storeId).collection('daily').orderBy('date', 'asc');

  if (startDate) {
    query = query.where('date', '>=', startDate);
  }
  if (endDate) {
    query = query.where('date', '<=', endDate);
  }

  const snapshot = await query.get();

  const rows: string[] = ['date,phone_calls,inquiries,bookings'];
  for (const doc of snapshot.docs) {
    const d = doc.data();
    rows.push(`${d.date ?? ''},${d.phone_calls ?? 0},${d.inquiries ?? 0},${d.bookings ?? 0}`);
  }

  const csv = rows.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kpi-${storeId}-export.csv"`,
    },
  });
}
