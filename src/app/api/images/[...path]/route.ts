import { list } from '@vercel/blob';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = `admin/${path.join('/')}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse('Not configured', { status: 500 });

  try {
    // Find the blob by prefix match
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    if (blobs.length === 0) return new NextResponse('Not found', { status: 404 });

    // Fetch using auth header
    const res = await fetch(blobs[0].downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new NextResponse('Not found', { status: 404 });
    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        'Content-Type': blobs[0].contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
