import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// Lightweight endpoint: returns open ticket count for sidebar badge.
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const db = getAdminDb();

    if (user.role === 'store_admin') {
      // Avoid composite index by filtering in code
      const snap = await db.collection('tickets').where('authorUid', '==', user.uid).get();
      const openCount = snap.docs.filter(d => d.data().status === 'open').length;
      return NextResponse.json({ open: openCount });
    }

    const snap = await db.collection('tickets').where('status', '==', 'open').count().get();
    return NextResponse.json({ open: snap.data().count });
  } catch {
    return NextResponse.json({ open: 0 });
  }
}
