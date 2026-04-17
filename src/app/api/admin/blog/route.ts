import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { blogPostWriteSchema } from '@/lib/validations';
import { sanitizeHtml } from '@/lib/sanitize';

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

  const parsed = blogPostWriteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }
  const { title, slug, content, published, summary, category, publishDate, metaTitle, metaDescription, sections, hero_image_url } = parsed.data;

  const db = getAdminDb();
  const now = new Date().toISOString();
  const data = {
    title,
    slug,
    content: sanitizeHtml(content),
    published,
    summary: summary ?? '',
    category: category ?? 'educational',
    publishDate: publishDate ?? now.slice(0, 10),
    metaTitle: metaTitle ?? title,
    metaDescription: metaDescription ?? summary ?? '',
    sections: sections ?? [],
    ...(hero_image_url ? { hero_image_url } : {}),
    author_uid: user.uid,
    created_at: now,
    updated_at: now,
  };

  const docRef = await db.collection('blog_posts').add(data);
  return NextResponse.json({ post: { id: docRef.id, ...data } }, { status: 201 });
}
