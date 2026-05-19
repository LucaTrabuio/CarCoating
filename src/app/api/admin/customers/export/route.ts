import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore, requirePiiAccess } from '@/lib/auth';
import { getCustomers } from '@/lib/customers';
import { customerDetailParamsSchema } from '@/lib/validations';
import { getClientIp } from '@/lib/rate-limit';
import { firestoreRateLimit } from '@/lib/rate-limit-firestore';

function escCsv(value: string | undefined | null): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const ip = getClientIp(req);

  const { allowed } = await firestoreRateLimit({
    key: `customers-export:${auth.user.uid}`,
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const storeId = req.nextUrl.searchParams.get('storeId') || '';
  const parsed = customerDetailParamsSchema.safeParse({ storeId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (!canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Export always requires a fresh PII step-up
  const pii = await requirePiiAccess(auth.user.uid, {
    storeId,
    action: 'export',
    adminEmail: auth.user.email,
    ip,
  });
  if (!pii.ok) return pii.response;

  try {
    const customers = await getCustomers({ storeId, limit: 10000 });

    const headers = ['メール', '名前', 'フリガナ', '電話', '郵便番号', '住所', '予約数', '問い合わせ数', '最終インタラクション', '作成日'];
    const rows = customers.map((c) => [
      escCsv(c.email),
      escCsv(c.name),
      escCsv(c.nameKana),
      escCsv(c.phone),
      escCsv(c.postalCode),
      escCsv(c.address),
      String(c.bookingCount),
      String(c.inquiryCount),
      escCsv(c.lastInteractionAt),
      escCsv(c.createdAt),
    ].join(','));

    const csv = '﻿' + [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="customers-${storeId}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('customer export failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
