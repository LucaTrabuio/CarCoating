import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore, requirePiiAccess } from '@/lib/auth';
import { getCustomers, getCustomersAcrossStores } from '@/lib/customers';
import { getAllV3StoreIds } from '@/lib/firebase-stores';
import { customerListQuerySchema } from '@/lib/validations';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const ip = getClientIp(req);
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = customerListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'storeId or allStores is required' }, { status: 400 });
  }

  const { storeId, allStores, q, limit } = parsed.data;

  // All-stores branch: super_admin only
  if (allStores) {
    if (auth.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pii = await requirePiiAccess(auth.user.uid, {
      storeId: 'all-stores',
      action: 'list',
      adminEmail: auth.user.email,
      ip,
    });
    if (!pii.ok) return pii.response;

    try {
      const storeIds = await getAllV3StoreIds();
      const customers = await getCustomersAcrossStores({ storeIds, q, limit });
      return NextResponse.json({ customers });
    } catch (error) {
      console.error('GET customers (all-stores) failed:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Per-store branch
  if (!storeId || !canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pii = await requirePiiAccess(auth.user.uid, {
    storeId,
    action: 'list',
    adminEmail: auth.user.email,
    ip,
  });
  if (!pii.ok) return pii.response;

  try {
    const customers = await getCustomers({ storeId, q, limit });
    return NextResponse.json({ customers });
  } catch (error) {
    console.error('GET customers failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
