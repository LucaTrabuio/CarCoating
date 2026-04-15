import { getDownloadUrl } from '@vercel/blob';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = path.join('/');
  try {
    const downloadUrl = await getDownloadUrl(`admin/${pathname}`);
    const res = await fetch(downloadUrl);
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
