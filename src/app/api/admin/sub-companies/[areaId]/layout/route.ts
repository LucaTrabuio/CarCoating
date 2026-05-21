import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { saveAreaLayout, getSubCompanyById } from '@/lib/firebase-stores';
import { areaLayoutWriteSchema } from '@/lib/validations';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ areaId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { areaId } = await params;

  try {
    const db = getAdminDb();
    const doc = await db.collection('sub_companies').doc(areaId).get();
    if (!doc.exists) {
      return NextResponse.json({ layout: null });
    }
    const data = doc.data();
    return NextResponse.json({ layout: data?.page_layout ?? null });
  } catch (error) {
    console.error(`GET /api/admin/sub-companies/${areaId}/layout error:`, error);
    return NextResponse.json({ layout: null });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ areaId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { areaId } = await params;

  const parsed = areaLayoutWriteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await saveAreaLayout(areaId, parsed.data.blocks);
    try {
      const sc = await getSubCompanyById(areaId);
      if (sc?.slug) revalidatePath(`/${sc.slug}`);
    } catch (e) {
      console.error('revalidatePath after area layout save failed:', e);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PUT /api/admin/sub-companies/${areaId}/layout error:`, error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
