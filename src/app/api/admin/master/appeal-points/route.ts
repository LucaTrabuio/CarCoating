import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin required' }, { status: 403 });
  }

  const db = getAdminDb();
  const doc = await db.collection('master_data').doc('appeal_points').get();
  const items = doc.exists ? doc.data()?.items ?? [] : [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin required' }, { status: 403 });
  }

  const body = await req.json();
  const { items } = body as { items: unknown[] };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection('master_data').doc('appeal_points').set({ items }, { merge: true });
  return NextResponse.json({ items });
}
