import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { store_id, customer_name, customer_email, customer_tel, services, car_size, estimated_price } = body;

    if (!store_id || !customer_name || !customer_email) {
      return NextResponse.json({ error: 'store_id, customer_name, customer_email are required' }, { status: 400 });
    }

    const qr_token = crypto.randomUUID();

    const db = getAdminDb();
    const docRef = db.collection('inquiries').doc();
    const inquiry = {
      id: docRef.id,
      store_id,
      customer_name,
      customer_email,
      customer_tel: customer_tel || '',
      services: services || [],
      car_size: car_size || '',
      estimated_price: estimated_price || 0,
      qr_token,
      created_at: new Date().toISOString(),
    };

    await docRef.set(inquiry);

    return NextResponse.json({ id: docRef.id, qr_token });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
