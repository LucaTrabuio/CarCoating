import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// Lightweight endpoint: returns count of pending reservations for the
// sidebar badge. Mirrors src/app/api/admin/tickets/count/route.ts.
// "Pending" = reservations whose `status === 'pending'`. store_admin
// is filtered to their managed stores via the chunked `in`-query
// pattern from the list endpoint. Errors swallow to `{ pending: 0 }`.
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const db = getAdminDb();

    if (user.role === 'store_admin') {
      const stores = user.managed_stores || [];
      if (stores.length === 0) return NextResponse.json({ pending: 0 });
      let pendingCount = 0;
      for (let i = 0; i < stores.length; i += 30) {
        const chunk = stores.slice(i, i + 30);
        const snap = await db.collection('reservations').where('storeId', 'in', chunk).get();
        pendingCount += snap.docs.filter(d => d.data().status === 'pending').length;
      }
      return NextResponse.json({ pending: pendingCount });
    }

    const snap = await db.collection('reservations').where('status', '==', 'pending').count().get();
    return NextResponse.json({ pending: snap.data().count });
  } catch (error) {
    console.error('bookings/count failed:', error);
    return NextResponse.json({ pending: 0 });
  }
}
