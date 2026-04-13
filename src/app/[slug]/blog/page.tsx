import Link from 'next/link';
import { blogArticles } from '@/data/blog-articles';

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
    if (snapshot.empty) return blogArticles; // fallback to hardcoded
    return snapshot.docs.map(doc => {
      const d = doc.data();
      return { slug: d.slug, title: d.title, summary: d.summary || '', category: d.category || 'educational', publishDate: d.publishDate || d.created_at?.slice(0, 10) || '' };
    });
  } catch {
    return blogArticles; // fallback on error
  }
}

export default async function V3BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: storeId } = await params;
  const base = `/${storeId}`;
  const articles = await getBlogPosts();

  return (
    <main>
      <section className="bg-[#0C3290] py-14 px-5 text-center">
        <div className="max-w-[700px] mx-auto">
          <Link href={base} className="text-xs text-white/40 hover:text-white/70 transition-colors mb-3 inline-block">← トップに戻る</Link>
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングブログ</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            初めてのコーティングで迷わないための基礎知識。ワックスとの違い、ガラスとセラミックの比較、施工後のお手入れまで。
          </p>
        </div>
      </section>

      <section className="py-12 px-5">
        <div className="max-w-[900px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => (
            <Link key={article.slug} href={`${base}/blog/${article.slug}`}
              className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category] || ''}`}>{categoryLabels[article.category] || article.category}</span>
                  <span className="text-[10px] text-gray-400">{article.publishDate}</span>
                </div>
                <h2 className="text-base font-bold text-[#0C3290] mb-2 group-hover:text-amber-700 transition-colors leading-snug">{article.title}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{article.summary}</p>
                <span className="inline-block mt-3 text-xs font-semibold text-amber-500 group-hover:underline">続きを読む →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12 px-5 bg-[#0C3290]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングを検討中の方へ</h2>
          <p className="text-sm text-white/40 mb-6">お車の状態を見て最適なコースをご提案します。</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`${base}/coatings`} className="px-5 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20">メニュー一覧</Link>
            <Link href={`${base}/booking`} className="px-5 py-2.5 bg-amber-500 text-[#0C3290] font-bold rounded-md text-sm hover:bg-amber-500">ご予約・お問い合わせ →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
