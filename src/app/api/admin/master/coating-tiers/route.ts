import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// GET: Return coating tier overrides from Firestore
export async function GET() {
  try {
    const auth = await requireAuth('super_admin');
    if (auth.error) return auth.error;

    const db = getAdminDb();
    const doc = await db.collection('master_data').doc('coating_tiers').get();
    if (!doc.exists) return NextResponse.json({ tiers: null });
    return NextResponse.json({ tiers: doc.data()?.tiers || null });
  } catch (error) {
    console.error('Error fetching coating tiers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save coating tier overrides
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('super_admin');
    if (auth.error) return auth.error;

    const { tiers } = await req.json();
    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'tiers must be an array' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('master_data').doc('coating_tiers').set({
      tiers,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving coating tiers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
