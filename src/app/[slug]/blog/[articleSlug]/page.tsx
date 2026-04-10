import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogArticles } from '@/data/blog-articles';
import type { Metadata } from 'next';

interface BlogPostFull {
  slug: string;
  title: string;
  summary: string;
  category: string;
  publishDate: string;
  metaTitle: string;
  metaDescription: string;
  sections: { heading: string; text: string }[];
}

async function getArticle(articleSlug: string): Promise<BlogPostFull | null> {
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin');
    const db = getAdminDb();
    const snapshot = await db.collection('blog_posts').where('slug', '==', articleSlug).limit(1).get();
    if (!snapshot.empty) {
      const d = snapshot.docs[0].data();
      return {
        slug: d.slug,
        title: d.title,
        summary: d.summary || '',
        category: d.category || 'educational',
        publishDate: d.publishDate || d.created_at?.slice(0, 10) || '',
        metaTitle: d.metaTitle || d.title,
        metaDescription: d.metaDescription || d.summary || '',
        sections: d.sections || [],
      };
    }
  } catch { /* fall through to hardcoded */ }
  // Fallback to hardcoded data
  const article = blogArticles.find(a => a.slug === articleSlug);
  if (!article) return null;
  return { ...article, sections: article.content };
}

export function generateStaticParams() {
  return blogArticles.map(article => ({ articleSlug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; articleSlug: string }> }): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const article = await getArticle(articleSlug);
  if (!article) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8081';
  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.summary || '';
  const ogImage = (article as unknown as Record<string, unknown>).og_image_url as string | undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/${slug}/blog/${articleSlug}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    alternates: {
      canonical: `${siteUrl}/${slug}/blog/${articleSlug}`,
    },
  };
}

const categoryLabels: Record<string, string> = { educational: '基礎知識', comparison: '比較', seasonal: '季節' };
const categoryColors: Record<string, string> = { educational: 'bg-blue-100 text-blue-700', comparison: 'bg-amber-100 text-amber-700', seasonal: 'bg-green-100 text-green-700' };

export default async function V3BlogArticlePage({ params }: { params: Promise<{ slug: string; articleSlug: string }> }) {
  const { slug: storeId, articleSlug } = await params;
  const base = `/${storeId}`;
  const article = await getArticle(articleSlug);
  if (!article) notFound();

  return (
    <main>
      <section className="bg-[#0C3290] py-14 px-5">
        <div className="max-w-[700px] mx-auto">
          <Link href={`${base}/blog`} className="text-xs text-white/40 hover:text-white/70 transition-colors mb-4 inline-block">← ブログ一覧に戻る</Link>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category] || ''}`}>{categoryLabels[article.category] || article.category}</span>
            <span className="text-[10px] text-white/30">{article.publishDate}</span>
          </div>
          <h1 className="text-white text-xl md:text-2xl font-bold leading-snug" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{article.title}</h1>
          <p className="text-white/40 text-sm mt-3 leading-relaxed">{article.summary}</p>
        </div>
      </section>

      <section className="py-12 px-5">
        <div className="max-w-[700px] mx-auto space-y-10">
          {article.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-bold text-[#0C3290] mb-3 flex items-center gap-3" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
                <span className="w-7 h-7 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                {section.heading}
              </h2>
              <p className="text-[13px] text-slate-600 leading-relaxed pl-10">{section.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-5 bg-[#0C3290]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングを検討中の方へ</h2>
          <p className="text-sm text-white/40 mb-6">お車の状態を見て最適なコースをご提案します。お気軽にお問い合わせください。</p>
          <Link href={`${base}/booking`} className="inline-block px-8 py-3 bg-amber-500 text-black font-bold rounded-xl text-sm hover:bg-amber-500 transition-colors">ご予約・お問い合わせ →</Link>
        </div>
      </section>
    </main>
  );
}
