import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import type { KeeperResponseDoc } from '@/lib/keeper-types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string; fileId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { surveyId, fileId } = await params;

  // responseId is required as a query param to locate the mirrored storagePath
  const responseId = req.nextUrl.searchParams.get('responseId');
  if (!responseId) {
    return NextResponse.json(
      { error: 'responseId query param required' },
      { status: 400 },
    );
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection('keeperSurveys')
      .doc(surveyId)
      .collection('responses')
      .doc(responseId)
      .get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    const responseDoc = snap.data() as KeeperResponseDoc;
    const fileEntry = responseDoc.files?.find(
      (f) => f.file_id === fileId && f.mirrored != null,
    );

    if (!fileEntry?.mirrored) {
      return NextResponse.json(
        { error: 'File not yet mirrored' },
        { status: 404 },
      );
    }

    const { storagePath } = fileEntry.mirrored;
    const storage = getAdminStorage();
    const fileObj = storage.bucket().file(storagePath);

    // V4 signed URL with 5-minute TTL
    const [signedUrl] = await fileObj.getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
      version: 'v4',
    });

    return NextResponse.redirect(signedUrl, 302);
  } catch (error) {
    console.error(
      `[keeper-surveys/${surveyId}/files/${fileId}] GET error:`,
      error,
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
