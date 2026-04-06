import { NextResponse } from 'next/server';
import { getV3CampaignDefaults, saveV3CampaignDefaults } from '@/lib/firebase-stores';
import type { CampaignDefaults } from '@/lib/types';

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
  try {
    const data: CampaignDefaults = await request.json();
    await saveV3CampaignDefaults(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/v3/campaign error:', error);
    return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
  }
}
