import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getV3CampaignDefaults, saveV3CampaignDefaults } from '@/lib/firebase-stores';
import { requireAuth } from '@/lib/auth';
import { campaignDefaultsSchema } from '@/lib/validations';
import { auditLog } from '@/lib/audit';

export async function GET() {
  try {
    const campaign = await getV3CampaignDefaults();
    return NextResponse.json(campaign);
  } catch (error) {
    console.error('GET /api/v3/campaign error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const result = campaignDefaultsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', issues: result.error.issues.map(i => i.message) }, { status: 400 });
    }

    await saveV3CampaignDefaults(result.data);
    auditLog('campaign_update', auth.user.uid);
    // The HQ campaign defaults feed every storefront's banner via the root
    // and per-store layouts (both have `revalidate = 60`). Without this
    // bust, a saved change to discount / force_hq_campaign / title / dates
    // would stay invisible on every cached page until the 60-second ISR
    // window naturally rolled over for that specific path — which only
    // happens lazily on traffic and explains why the toggle "worked on
    // localhost" (dev mode = no cache) "but not on the live version"
    // (every prod store page had a fresh cached HTML).
    try {
      revalidatePath('/', 'layout');
    } catch (e) {
      console.error('revalidatePath after campaign save failed:', e);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/v3/campaign error:', error);
    return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
  }
}
