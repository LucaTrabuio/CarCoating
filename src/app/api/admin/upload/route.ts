import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminStorage } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_FROM_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth('store_admin');
  if (auth.error) return auth.error;

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File must be between 1 byte and ${MAX_SIZE} bytes` }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  // Path convention: stores/<storeId>/<filename> if storeId provided; otherwise shared/<filename>.
  // storeId must match /^[a-z0-9_-]+$/ — reject anything else to prevent path traversal.
  const rawStoreId = (formData.get('storeId') as string | null)?.trim();
  if (rawStoreId && !/^[a-z0-9_-]+$/i.test(rawStoreId)) {
    return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 });
  }
  const ext = EXT_FROM_MIME[file.type];
  const filename = `${Date.now()}-${nanoid(10)}.${ext}`;
  const key = rawStoreId ? `stores/${rawStoreId}/${filename}` : `shared/${filename}`;

  try {
    const bucket = getAdminStorage().bucket();
    const storageFile = bucket.file(key);
    const buffer = Buffer.from(await file.arrayBuffer());
    const downloadToken = randomUUID();

    await storageFile.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(key)}?alt=media&token=${downloadToken}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
