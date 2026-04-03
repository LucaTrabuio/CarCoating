import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoreByIdAsync, getBaseUrl } from '@/lib/store-data';
import { blogArticles } from '@/data/blog-articles';

interface GuidePageProps {
  params: Promise<{ storeId: string }>;
}

export default async function StoreGuidePage({ params }: GuidePageProps) {
  const { storeId } = await params;
  const baseUrl = await getBaseUrl();
  const store = await getStoreByIdAsync(storeId, baseUrl);

  if (!store) notFound();

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1
          className="text-white text-xl font-bold"
          style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
        >
          コーティングガイド
        </h1>
        <p className="text-white/50 text-sm mt-1">{store.store_name}</p>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto">
          {/* Table of contents */}
          <div className="bg-gray-50 rounded-xl p-6 mb-10">
            <h2 className="text-base font-bold text-[#0f1c2e] mb-3">目次</h2>
            <ol className="space-y-2">
              {blogArticles.map((article, idx) => (
                <li key={article.slug}>
                  <a
                    href={`#${article.slug}`}
                    className="text-sm text-amber-600 hover:underline"
                  >
                    {idx + 1}. {article.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Articles */}
          {blogArticles.map((article, idx) => (
            <article
              key={article.slug}
              id={article.slug}
              className="mb-12 scroll-mt-8"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">
                  {article.publishDate}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    article.category === 'educational'
                      ? 'bg-blue-50 text-blue-600'
                      : article.category === 'comparison'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-green-50 text-green-600'
                  }`}
                >
                  {article.category === 'educational'
                    ? '基礎知識'
                    : article.category === 'comparison'
                      ? '比較'
                      : '季節'}
                </span>
              </div>
              <h2
                className="text-lg font-bold text-[#0f1c2e] mb-2"
                style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
              >
                {article.title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{article.summary}</p>

              {article.content.map((section, sIdx) => (
                <div key={sIdx} className="mb-4">
                  <h3 className="text-base font-bold text-[#0f1c2e] mb-1">
                    {section.heading}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.text}
                  </p>
                </div>
              ))}

              {idx < blogArticles.length - 1 && (
                <hr className="border-gray-200 mt-8" />
              )}
            </article>
          ))}

          {/* CTA */}
          <div className="bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
            <h3 className="font-bold text-lg mb-1">
              コーティングの選び方に迷ったら
            </h3>
            <p className="text-sm opacity-60 mb-4">
              お気軽にご相談ください
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href={`/${storeId}/coatings`}
                className="px-5 py-2.5 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm"
              >
                コース一覧 →
              </Link>
              <Link
                href={`/${storeId}/price`}
                className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-sm"
              >
                料金シミュレーター →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
