import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// Lightweight endpoint: returns count of unhandled inquiries for the
// sidebar badge. Mirrors src/app/api/admin/tickets/count/route.ts.
// "Open" = inquiries whose `status` is `'new'` (or absent — older docs
// pre-status field count as open). store_admin is filtered to their
// managed stores via the same chunked `in`-query pattern as the list
// endpoint. Errors swallow to `{ open: 0 }` so the badge never throws.
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const db = getAdminDb();
    const isOpen = (status: unknown) => status === 'new' || status === undefined || status === null;

    if (user.role === 'store_admin') {
      const stores = user.managed_stores || [];
      if (stores.length === 0) return NextResponse.json({ open: 0 });
      let openCount = 0;
      for (let i = 0; i < stores.length; i += 30) {
        const chunk = stores.slice(i, i + 30);
        const snap = await db.collection('inquiries').where('storeId', 'in', chunk).get();
        openCount += snap.docs.filter(d => isOpen(d.data().status)).length;
      }
      return NextResponse.json({ open: openCount });
    }

    // super_admin: status is nullable so we can't use `.count()` aggregate
    // with a `where('status','==','new')` filter (misses null/undefined).
    // Full scan + in-memory filter mirrors the tickets-count store_admin
    // pattern and stays well within function timeout for current volume.
    const snap = await db.collection('inquiries').get();
    const openCount = snap.docs.filter(d => isOpen(d.data().status)).length;
    return NextResponse.json({ open: openCount });
  } catch (error) {
    console.error('inquiries/count failed:', error);
    return NextResponse.json({ open: 0 });
  }
}
