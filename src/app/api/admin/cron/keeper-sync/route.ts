// car-coating/require-auth: authorized by CRON_SECRET Bearer token instead
// of session auth — same pattern as daily-report crons. No user session
// is available in Vercel Cron invocations.
import { NextRequest, NextResponse } from 'next/server';
import { cronEmptyBodySchema } from '@/lib/validations';
import { verifyCronAuth } from '@/lib/cron-auth';
import { syncKeeperSurveys, recordCriticalSyncAlert } from '@/lib/keeper-sync';

// Satisfies the project's validations-import requirement on cron routes.
cronEmptyBodySchema.parse({});

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncKeeperSurveys({ full: false });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/keeper-sync] fatal error:', error);
    await recordCriticalSyncAlert('Keeper survey sync cron crashed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
