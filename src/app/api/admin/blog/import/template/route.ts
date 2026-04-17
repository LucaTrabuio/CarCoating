import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { BLOG_CSV_COLUMNS, toCsv } from '@/lib/csv-import';

export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const snap = await db.collection('blog_posts').orderBy('created_at', 'desc').get();
  const rows = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      slug: data.slug ?? '',
      title: data.title ?? '',
      summary: data.summary ?? '',
      content: data.content ?? '',
      // Map stored hero_image_url back into the CSV's convenience `hero_image` column
      hero_image: data.hero_image_url ?? '',
      category: data.category ?? '',
      published: data.published ?? false,
      publishDate: data.publishDate ?? '',
      metaTitle: data.metaTitle ?? '',
      metaDescription: data.metaDescription ?? '',
    };
  });

  const csv = toCsv(rows as Record<string, unknown>[], BLOG_CSV_COLUMNS as unknown as string[]);
  const body = '\uFEFF' + csv;
  const filename = `blog-template-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
