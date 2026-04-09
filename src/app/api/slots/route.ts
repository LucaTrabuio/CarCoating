import { NextResponse, type NextRequest } from 'next/server';
import { getAvailableSlots, getAvailableDates } from '@/lib/slots';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const storeId = searchParams.get('store');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (!storeId) {
      return NextResponse.json({ error: 'store parameter is required' }, { status: 400 });
    }

    // Single date mode: return available time slots
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'date must be YYYY-MM-DD format' }, { status: 400 });
      }
      const slots = await getAvailableSlots(storeId, date);
      return NextResponse.json({ slots });
    }

    // Month mode: return available dates
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: 'month must be YYYY-MM format' }, { status: 400 });
      }
      const [year, m] = month.split('-').map(Number);
      const dates = await getAvailableDates(storeId, year, m);
      return NextResponse.json({ dates });
    }

    return NextResponse.json({ error: 'Either date or month parameter is required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
