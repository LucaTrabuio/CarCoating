import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const snapshot = await db.collection('blog_posts').orderBy('created_at', 'desc').get();
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;
  const user = auth.user;

  const body = await req.json();
  const { title, slug, content, published, summary, category, publishDate, metaTitle, metaDescription, sections } = body as {
    title: string;
    slug: string;
    content: string;
    published: boolean;
    summary?: string;
    category?: string;
    publishDate?: string;
    metaTitle?: string;
    metaDescription?: string;
    sections?: { heading: string; text: string }[];
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
    summary: summary ?? '',
    category: category ?? 'educational',
    publishDate: publishDate ?? now.slice(0, 10),
    metaTitle: metaTitle ?? title,
    metaDescription: metaDescription ?? summary ?? '',
    sections: sections ?? [],
    author_uid: user.uid,
    created_at: now,
    updated_at: now,
  };

  const docRef = await db.collection('blog_posts').add(data);
  return NextResponse.json({ post: { id: docRef.id, ...data } }, { status: 201 });
}
