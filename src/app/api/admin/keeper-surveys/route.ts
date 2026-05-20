import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import type { KeeperSurveyDoc } from '@/lib/keeper-types';

export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const db = getAdminDb();
    const snap = await db.collection('keeperSurveys').orderBy('syncedAt', 'desc').get();
    const surveys: KeeperSurveyDoc[] = snap.docs.map(
      (d) => d.data() as KeeperSurveyDoc,
    );
    return NextResponse.json({ surveys });
  } catch (error) {
    console.error('[keeper-surveys] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
