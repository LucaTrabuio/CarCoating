import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore, requirePiiAccess } from '@/lib/auth';
import { getCustomers, getCustomersAcrossStores } from '@/lib/customers';
import { getAllV3StoreIds } from '@/lib/firebase-stores';
import { customerListQuerySchema } from '@/lib/validations';
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

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = customerListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'storeId or allStores is required' }, { status: 400 });
  }

  const { storeId, allStores } = parsed.data;
  const dateSuffix = new Date().toISOString().slice(0, 10);

  // All-stores export — super_admin only
  if (allStores) {
    if (auth.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pii = await requirePiiAccess(auth.user.uid, {
      storeId: 'all-stores',
      action: 'export',
      adminEmail: auth.user.email,
      ip,
    });
    if (!pii.ok) return pii.response;

    try {
      const storeIds = await getAllV3StoreIds();
      const customers = await getCustomersAcrossStores({ storeIds, limit: 10000 });

      const headers = ['店舗ID', 'メール', '名前', 'フリガナ', '電話', '郵便番号', '住所', '予約数', '問い合わせ数', '最終インタラクション', '作成日'];
      const rows = customers.map((c) => [
        escCsv(c.storeId),
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
          'Content-Disposition': `attachment; filename="customers-all-${dateSuffix}.csv"`,
        },
      });
    } catch (error) {
      console.error('customer export (all-stores) failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Per-store export
  if (!storeId || !canManageStore(auth.user, storeId)) {
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
        'Content-Disposition': `attachment; filename="customers-${storeId}-${dateSuffix}.csv"`,
      },
    });
  } catch (error) {
    console.error('customer export failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
