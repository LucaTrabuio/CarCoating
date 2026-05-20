import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import type { KeeperResponseDoc } from '@/lib/keeper-types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { surveyId } = await params;

  try {
    const db = getAdminDb();
    // Order by submitted_at desc within the single survey's subcollection
    // (single-field index, auto-indexed — no composite index needed).
    const snap = await db
      .collection('keeperSurveys')
      .doc(surveyId)
      .collection('responses')
      .orderBy('submitted_at', 'desc')
      .get();

    const responses: KeeperResponseDoc[] = snap.docs.map(
      (d) => d.data() as KeeperResponseDoc,
    );
    return NextResponse.json({ surveyId, responses });
  } catch (error) {
    console.error(`[keeper-surveys/${surveyId}/responses] GET error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
