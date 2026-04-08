import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/auth';

// POST: Revalidate a store page after admin edits
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path } = await req.json();
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
