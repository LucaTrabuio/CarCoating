import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const doc = await db.collection('master_data').doc('appeal_points').get();
  const items = doc.exists ? doc.data()?.items ?? [] : [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const body = await req.json();
  const { items } = body as { items: unknown[] };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection('master_data').doc('appeal_points').set({ items }, { merge: true });
  return NextResponse.json({ items });
}
