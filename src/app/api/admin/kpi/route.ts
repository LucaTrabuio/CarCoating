import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

async function fetchKpiForStore(storeId: string, startDate: string | null, endDate: string | null) {
  const db = getAdminDb();
  let query = db.collection('kpi').doc(storeId).collection('daily').orderBy('date', 'asc');
  if (startDate) query = query.where('date', '>=', startDate);
  if (endDate) query = query.where('date', '<=', endDate);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, storeId, ...doc.data() }));
}

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

  const records = await fetchKpiForStore(storeId, startDate, endDate);
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { storeId, date, phone_calls, inquiries, bookings } = body as {
    storeId: string;
    date: string;
    phone_calls: number;
    inquiries: number;
    bookings: number;
  };

  if (!storeId || !date) {
    return NextResponse.json({ error: 'storeId and date are required' }, { status: 400 });
  }

  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  const docRef = db.collection('kpi').doc(storeId).collection('daily').doc(date);
  const data = {
    date,
    phone_calls: phone_calls ?? 0,
    inquiries: inquiries ?? 0,
    bookings: bookings ?? 0,
    updated_at: new Date().toISOString(),
    updated_by: user.uid,
  };

  await docRef.set(data, { merge: true });
  return NextResponse.json({ record: data }, { status: 201 });
}
