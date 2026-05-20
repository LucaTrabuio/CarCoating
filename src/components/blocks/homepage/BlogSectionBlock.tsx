import Link from 'next/link';
import { blogArticles } from '@/data/blog-articles';

const categoryColors: Record<string, string> = {
  educational: 'bg-blue-100 text-blue-700',
  comparison: 'bg-amber-100 text-amber-700',
  seasonal: 'bg-green-100 text-green-700',
};
const categoryLabels: Record<string, string> = {
  educational: '基礎知識',
  comparison: '比較',
  seasonal: '季節',
};

interface Props {
  maxArticles?: number;
  heading?: string;
}

export default function BlogSectionBlock({ maxArticles = 4, heading = 'コラム・お役立ち情報' }: Props) {
  const featuredArticles = blogArticles.slice(0, maxArticles);

  return (
    <section className="py-16 px-5 bg-white">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>{heading}</h2>
          <p className="text-sm text-gray-400 mt-2">初めてのコーティングで迷わないための基礎知識</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredArticles.map(article => (
            <Link key={article.slug} href={`/blog/${article.slug}`}
              className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[article.category]}`}>
                    {categoryLabels[article.category]}
                  </span>
                  <span className="text-[10px] text-gray-400">{article.publishDate}</span>
                </div>
                <h3 className="text-sm font-bold text-[#0C3290] mb-2 group-hover:text-amber-700 transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{article.summary}</p>
                <span className="inline-block mt-3 text-xs font-semibold text-blue-600 group-hover:underline">続きを読む →</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/blog" className="px-6 py-2.5 bg-gray-100 text-[#0C3290] font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors">
            すべての記事を見る →
          </Link>
        </div>
      </div>
    </section>
  );
}
