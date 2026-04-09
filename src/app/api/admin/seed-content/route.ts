import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { blogArticles } from '@/data/blog-articles';
import { news } from '@/data/news';

/** One-time seed endpoint to import hardcoded blog/news into Firestore */
export async function POST() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const results = { blogs: 0, news: 0, skipped: 0 };

  // Seed blog posts
  for (const article of blogArticles) {
    // Check if already exists by slug
    const existing = await db.collection('blog_posts').where('slug', '==', article.slug).limit(1).get();
    if (!existing.empty) { results.skipped++; continue; }

    await db.collection('blog_posts').add({
      title: article.title,
      slug: article.slug,
      content: article.content.map(s => `## ${s.heading}\n\n${s.text}`).join('\n\n'),
      summary: article.summary,
      category: article.category,
      publishDate: article.publishDate,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      sections: article.content,
      published: true,
      author_uid: auth.user.uid,
      created_at: new Date(article.publishDate).toISOString(),
      updated_at: new Date().toISOString(),
    });
    results.blogs++;
  }

  // Seed global news into a site_config/news document
  const newsDoc = await db.collection('site_config').doc('news').get();
  if (!newsDoc.exists) {
    await db.collection('site_config').doc('news').set({
      items: news.map(n => ({
        id: n.id,
        title: n.title,
        date: n.date,
        category: n.category,
        body: n.body || '',
        link: n.link || '',
        visible: true,
      })),
      updated_at: new Date().toISOString(),
    });
    results.news = news.length;
  }

  return NextResponse.json({ success: true, ...results });
}
