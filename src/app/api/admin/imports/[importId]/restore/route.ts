import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { restoreImport } from '@/lib/import-backups';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { importId } = await params;

  // Load metadata first for authorization check
  const db = getAdminDb();
  const metaSnap = await db.collection('import_backups').doc(importId).get();
  if (!metaSnap.exists) return NextResponse.json({ error: 'Import not found' }, { status: 404 });
  const meta = metaSnap.data() as { collection: string; createdBy?: string };

  // Authorization:
  //   - super_admin can restore anything
  //   - store_admin can restore only imports they triggered, AND only
  //     if every affected doc in the snapshot is a store they manage
  if (user.role !== 'super_admin') {
    const ownedImport = meta.createdBy === user.email || meta.createdBy === user.uid;
    if (!ownedImport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // Verify every item in the snapshot is a store the user manages
    if (meta.collection !== 'stores') {
      return NextResponse.json({ error: 'Forbidden: only super_admin can restore blog imports' }, { status: 403 });
    }
    const itemsSnap = await db.collection('import_backups').doc(importId).collection('items').get();
    for (const item of itemsSnap.docs) {
      if (!canManageStore(user, item.id)) {
        return NextResponse.json({ error: `Forbidden: snapshot contains store "${item.id}" outside your scope` }, { status: 403 });
      }
    }
  }

  const result = await restoreImport(importId);
  return NextResponse.json({ success: true, restored: result.restored });
}
