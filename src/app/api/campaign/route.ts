import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { CampaignDefaults } from '@/lib/types';

const BLOB_KEY = 'campaign.json';

const HARDCODED_DEFAULTS: CampaignDefaults = {
  title: 'Web予約限定キャンペーン',
  color: '#F0EA01',
  start: '2026-04-01',
  end: '2026-04-30',
  discount: 20,
};

export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      const campaign: CampaignDefaults = await res.json();
      return NextResponse.json(campaign);
    }
  } catch (e) {
    console.error('Campaign blob read error:', e);
  }
  return NextResponse.json(HARDCODED_DEFAULTS);
}

export async function POST(request: Request) {
  try {
    const campaign: CampaignDefaults = await request.json();
    const { blobs } = await list({ prefix: BLOB_KEY });
    for (const blob of blobs) await del(blob.url);
    await put(BLOB_KEY, JSON.stringify(campaign), {
      access: 'public',
      contentType: 'application/json',
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Campaign blob write error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
