import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore, requirePiiAccess } from '@/lib/auth';
import { getCustomer } from '@/lib/customers';
import { customerDetailParamsSchema } from '@/lib/validations';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const ip = getClientIp(req);
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);

  const storeId = req.nextUrl.searchParams.get('storeId') || '';
  const parsed = customerDetailParamsSchema.safeParse({ storeId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (!canManageStore(auth.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pii = await requirePiiAccess(auth.user.uid, {
    storeId,
    action: 'detail',
    adminEmail: auth.user.email,
    email,
    ip,
  });
  if (!pii.ok) return pii.response;

  try {
    const customer = await getCustomer(storeId, email);
    if (!customer) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (error) {
    console.error('GET customer detail failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
