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
    let query: FirebaseFirestore.Query = db.collection('tickets').where('status', '==', 'open');

    if (user.role === 'store_admin') {
      query = query.where('authorUid', '==', user.uid);
    }

    const snap = await query.count().get();
    return NextResponse.json({ open: snap.data().count });
  } catch {
    return NextResponse.json({ open: 0 });
  }
}
