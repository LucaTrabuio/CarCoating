import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth, canManageStore } from '@/lib/auth';
import {
  getGlobalDefaults,
  isSectionLocked,
  parseOverrideFlags,
  serializeOverrideFlags,
} from '@/lib/global-defaults';

// GET: Fetch page layout for a store
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  const doc = await db.collection('stores').doc(storeId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const data = doc.data();
  return NextResponse.json({
    page_layout: data?.page_layout || null,
    store_news: data?.store_news || null,
    blur_config: data?.blur_config || null,
    certifications: data?.certifications || null,
    appeal_points: data?.appeal_points || null,
    banners: data?.banners || null,
  });
}

// PUT: Save page layout for a store
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { layout } = await req.json();
  if (!layout) {
    return NextResponse.json({ error: 'Missing layout' }, { status: 400 });
  }

  // Validate it's valid JSON
  try {
    const parsed = JSON.parse(layout);
    if (!parsed.version || !Array.isArray(parsed.blocks)) {
      throw new Error('Invalid layout structure');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid layout JSON' }, { status: 400 });
  }

  // Global-defaults enforcement: reject if page_layout is locked.
  const defaults = await getGlobalDefaults();
  if (isSectionLocked('page_layout', defaults)) {
    return NextResponse.json(
      { error: 'section_locked', key: 'page_layout', message: 'Page layout is locked by the super admin.' },
      { status: 403 },
    );
  }

  // Mark as an explicit override on this store.
  const db = getAdminDb();
  const ref = db.collection('stores').doc(storeId);
  const existing = await ref.get();
  const existingFlagsRaw = existing.exists ? (existing.data()?.override_flags as string | undefined) : undefined;
  const flags = parseOverrideFlags(existingFlagsRaw);
  flags.page_layout = true;

  await ref.set(
    {
      page_layout: layout,
      override_flags: serializeOverrideFlags(flags),
    },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}
