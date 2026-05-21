import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getStoresBySubCompany } from '@/lib/firebase-stores';
import { collectStoreBanners } from '@/lib/area-blocks';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ areaId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { areaId } = await params;

  try {
    const rawStores = await getStoresBySubCompany(areaId);
    const stores = rawStores.map(s => ({
      store_id: s.store_id,
      store_name: s.store_name,
      banners: collectStoreBanners(s),
    }));
    return NextResponse.json({ stores });
  } catch (err) {
    console.error(`GET /api/admin/sub-companies/${areaId}/stores error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
