import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { postId } = await params;
  const db = getAdminDb();
  const doc = await db.collection('blog_posts').doc(postId).get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({ post: { id: doc.id, ...doc.data() } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { postId } = await params;
  const body = await req.json();

  const db = getAdminDb();
  const docRef = db.collection('blog_posts').doc(postId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const updateData = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  await docRef.set(updateData, { merge: true });
  return NextResponse.json({ post: { id: postId, ...doc.data(), ...updateData } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { postId } = await params;
  const db = getAdminDb();
  const docRef = db.collection('blog_posts').doc(postId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  await docRef.delete();
  return NextResponse.json({ success: true });
}
