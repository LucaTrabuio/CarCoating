import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin required' }, { status: 403 });
  }

  const db = getAdminDb();
  const snapshot = await db.collection('blog_posts').orderBy('created_at', 'desc').get();
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin required' }, { status: 403 });
  }

  const body = await req.json();
  const { title, slug, content, published } = body as {
    title: string;
    slug: string;
    content: string;
    published: boolean;
  };

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const data = {
    title,
    slug,
    content: content ?? '',
    published: published ?? false,
    author_uid: user.uid,
    created_at: now,
    updated_at: now,
  };

  const docRef = await db.collection('blog_posts').add(data);
  return NextResponse.json({ post: { id: docRef.id, ...data } }, { status: 201 });
}
