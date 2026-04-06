import { NextResponse } from 'next/server';
import { exportV3StoresToCSV } from '@/lib/firebase-stores';

export async function GET() {
  try {
    const csv = await exportV3StoresToCSV();
    const bom = '\uFEFF';
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="v3-stores.csv"',
      },
    });
  } catch (error) {
    console.error('GET /api/v3/stores/export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
