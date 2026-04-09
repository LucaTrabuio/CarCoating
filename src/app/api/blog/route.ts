import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/** Public endpoint — returns published blog posts */
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('blog_posts')
      .where('published', '==', true)
      .orderBy('created_at', 'desc')
      .get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('GET /api/blog error:', error);
    return NextResponse.json({ posts: [] });
  }
}
