import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogArticles } from '@/data/blog-articles';

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.metaTitle,
    description: article.metaDescription,
  };
}

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

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <main>
      {/* HERO */}
      <section className="bg-[#0f1c2e] py-14 px-5">
        <div className="max-w-[700px] mx-auto">
          <Link
            href="/blog"
            className="text-xs text-white/40 hover:text-white/70 transition-colors mb-4 inline-block"
          >
            ← ブログ一覧に戻る
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category]}`}
            >
              {categoryLabels[article.category]}
            </span>
            <span className="text-[10px] text-white/30">
              {article.publishDate}
            </span>
          </div>
          <h1
            className="text-white text-xl md:text-2xl font-bold leading-snug"
            style={{ fontFamily: '"Noto Serif JP", serif' }}
          >
            {article.title}
          </h1>
          <p className="text-white/40 text-sm mt-3 leading-relaxed">
            {article.summary}
          </p>
        </div>
      </section>

      {/* ARTICLE CONTENT */}
      <section className="py-12 px-5">
        <div className="max-w-[700px] mx-auto space-y-10">
          {article.content.map((section, i) => (
            <div key={i}>
              <h2
                className="text-lg font-bold text-[#0f1c2e] mb-3 flex items-center gap-3"
                style={{ fontFamily: '"Noto Serif JP", serif' }}
              >
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                  {i + 1}
                </span>
                {section.heading}
              </h2>
              <p className="text-[13px] text-slate-600 leading-relaxed pl-10">
                {section.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-5 bg-[#0f1c2e]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2
            className="text-lg font-bold mb-2"
            style={{ fontFamily: '"Noto Serif JP", serif' }}
          >
            コーティングを検討中の方へ
          </h2>
          <p className="text-sm text-white/40 mb-6">
            お車の状態を見て最適なコースをご提案します。お気軽にお問い合わせください。
          </p>
          <Link
            href="/booking"
            className="inline-block px-8 py-3 bg-amber-500 text-white font-bold rounded-xl text-sm hover:bg-amber-600 transition-colors"
          >
            ご予約・お問い合わせ →
          </Link>
        </div>
      </section>
    </main>
  );
}
