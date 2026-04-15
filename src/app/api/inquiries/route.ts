import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const inquirySchema = z.object({
  store_id: z.string().min(1).max(100),
  customer_name: z.string().min(1).max(100),
  customer_email: z.string().email().max(200),
  customer_tel: z.string().max(30).optional(),
  services: z.array(z.string().max(100)).max(50).optional(),
  car_size: z.string().max(20).optional(),
  estimated_price: z.number().min(0).max(10_000_000).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`inquiries:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const qr_token = crypto.randomUUID();
    const db = getAdminDb();
    const docRef = db.collection('inquiries').doc();
    const inquiry = {
      id: docRef.id,
      ...parsed.data,
      customer_tel: parsed.data.customer_tel || '',
      services: parsed.data.services || [],
      car_size: parsed.data.car_size || '',
      estimated_price: parsed.data.estimated_price || 0,
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
