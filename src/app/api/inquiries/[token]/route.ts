import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  // Rate limit: 30 requests/min per IP (defense-in-depth against token brute force)
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`inquiry:${ip}`, 30);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { token } = await params;

    // Reject obviously malformed tokens before hitting Firestore
    if (!token || token.length < 16 || token.length > 128) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('inquiries')
      .where('qr_token', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return NextResponse.json({
      id: data.id,
      store_id: data.store_id,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_tel: data.customer_tel,
      services: data.services,
      car_size: data.car_size,
      estimated_price: data.estimated_price,
      qr_token: data.qr_token,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
