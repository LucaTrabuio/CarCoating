import { put } from '@vercel/blob';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { nanoid } from 'nanoid';

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

  const ext = EXT_FROM_MIME[file.type];
  const key = `admin/${Date.now()}-${nanoid(10)}.${ext}`;
  try {
    const blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('Blob upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    if (message.includes('BLOB_READ_WRITE_TOKEN') || message.includes('token')) {
      return NextResponse.json({ error: 'Blob storage not configured. Set BLOB_READ_WRITE_TOKEN in environment variables.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
