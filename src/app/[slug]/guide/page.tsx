import { notFound } from 'next/navigation';
import Link from 'next/link';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  const storeName = resolved?.subCompanyName ?? resolved?.store.store_name ?? 'KeePer PRO SHOP';
  return {
    title: `コーティングガイド｜${storeName}`,
    description: `カーコーティングの基礎知識・選び方・お手入れ方法をご紹介します。`,
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();

  const base = `/${slug}`;

  return (
    <main>
      <section className="bg-[#0f1c2e] py-16 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a] via-[#14253a] to-[#0f1c2e]" />
        <div className="relative max-w-[900px] mx-auto">
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            コーティングガイド
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            カーコーティングの基礎知識から選び方、施工後のお手入れまで。
          </p>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-[700px] mx-auto text-center">
          <div className="text-5xl mb-4 opacity-30">📖</div>
          <h2 className="text-lg font-bold text-[#0f1c2e] mb-2">準備中</h2>
          <p className="text-sm text-slate-500 mb-8">
            コーティングガイドの記事を準備中です。<br />
            しばらくお待ちください。
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`${base}/coatings`}
              className="px-6 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              メニュー一覧を見る →
            </Link>
            <Link
              href={`${base}/price`}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors"
            >
              見積もりシミュレーター
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
