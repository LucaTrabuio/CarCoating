import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { readStorageBackup } from '@/lib/import-backups';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { importId } = await params;
  const db = getAdminDb();
  const metaSnap = await db.collection('import_backups').doc(importId).get();
  if (!metaSnap.exists) return NextResponse.json({ error: 'Import not found' }, { status: 404 });
  const meta = metaSnap.data() as { createdBy?: string };

  if (auth.user.role !== 'super_admin') {
    const owned = meta.createdBy === auth.user.email || meta.createdBy === auth.user.uid;
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const buf = await readStorageBackup(importId);
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="import-${importId}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backup not found' },
      { status: 404 },
    );
  }
}
