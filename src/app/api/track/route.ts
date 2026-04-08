import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Public tracking endpoint — no auth required
// Increments daily KPI counters for a store
export async function POST(req: NextRequest) {
  try {
    const { storeId, event } = await req.json();

    if (!storeId || !event) {
      return NextResponse.json({ error: 'Missing storeId or event' }, { status: 400 });
    }

    const fieldMap: Record<string, string> = {
      phone_call: 'phone_calls',
      inquiry: 'inquiries',
      booking: 'bookings',
      page_view: 'page_views',
      cta_booking: 'cta_booking_clicks',
      cta_inquiry: 'cta_inquiry_clicks',
      line_click: 'line_clicks',
      quiz_complete: 'quiz_completions',
      plan_select: 'plan_selections',
    };

    if (!fieldMap[event]) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const db = getAdminDb();
    const docRef = db.collection('kpi').doc(storeId).collection('daily').doc(today);

    await docRef.set(
      {
        date: today,
        [fieldMap[event]]: FieldValue.increment(1),
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
