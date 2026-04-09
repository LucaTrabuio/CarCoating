import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

const COLLECTION = 'site_config';
const DOC_ID = 'homepage';

export async function GET() {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!doc.exists) return NextResponse.json({ layout: null });
    return NextResponse.json({ layout: doc.data() });
  } catch (error) {
    console.error('GET /api/admin/homepage error:', error);
    return NextResponse.json({ layout: null });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const db = getAdminDb();
    await db.collection(COLLECTION).doc(DOC_ID).set({
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.uid,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/admin/homepage error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
