import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

const PATH_RE = /^\/[A-Za-z0-9/_\-\[\]]{0,200}$/;

// POST: Revalidate a store page after admin edits
export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { path } = await req.json();
  if (typeof path !== 'string' || !PATH_RE.test(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
