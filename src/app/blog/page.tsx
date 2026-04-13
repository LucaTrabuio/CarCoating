import Link from 'next/link';
import { blogArticles } from '@/data/blog-articles';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ブログ・コラム｜KeePer PRO SHOP',
  description: 'カーコーティングの基礎知識、比較、季節の情報など。',
};

const categoryLabels: Record<string, string> = {
  educational: '基礎知識',
  comparison: '比較',
  seasonal: '季節',
};

const categoryColors: Record<string, string> = {
  educational: 'bg-blue-100 text-blue-700',
  comparison: 'bg-amber-100 text-amber-700',
  seasonal: 'bg-green-100 text-green-700',
};

interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishDate: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin');
    const db = getAdminDb();
    const snapshot = await db.collection('blog_posts')
      .where('published', '==', true)
      .orderBy('created_at', 'desc')
      .get();
    if (snapshot.empty) return blogArticles;
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { slug: d.slug, title: d.title, summary: d.summary || '', category: d.category || 'educational', publishDate: d.publishDate || d.created_at?.slice(0, 10) || '' };
    });
  } catch {
    return blogArticles;
  }
}

export default async function BlogListPage() {
  const articles = await getBlogPosts();

  return (
    <main>
      <section className="bg-[#0C3290] py-8 md:py-14 px-5 text-center">
        <div className="max-w-[700px] mx-auto">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors mb-3 inline-block">← トップページに戻る</Link>
          <h1 className="text-white text-2xl md:text-3xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>ブログ・コラム</h1>
          <p className="text-white/40 text-sm mt-2">カーコーティングに関する基礎知識やお役立ち情報</p>
        </div>
      </section>

      <section className="py-12 px-5">
        <div className="max-w-[900px] mx-auto grid md:grid-cols-3 gap-5">
          {articles.map(article => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category] || ''}`}>{categoryLabels[article.category] || article.category}</span>
                  <span className="text-[10px] text-gray-400">{article.publishDate}</span>
                </div>
                <h2 className="font-bold text-[#0C3290] text-sm leading-snug mb-2">{article.title}</h2>
                <p className="text-xs text-gray-500 line-clamp-3">{article.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
