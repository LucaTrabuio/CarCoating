import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { keeperSyncRequestSchema } from '@/lib/validations';
import { syncKeeperSurveys, recordCriticalSyncAlert } from '@/lib/keeper-sync';

export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = keeperSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  try {
    const result = await syncKeeperSurveys({ full: parsed.data.full });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[keeper-surveys/sync] fatal error:', error);
    await recordCriticalSyncAlert('Manual Keeper survey sync crashed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
