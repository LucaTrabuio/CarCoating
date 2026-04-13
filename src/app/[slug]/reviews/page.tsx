'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SAMPLE_REVIEWS = [
  { author: '田中太郎', rating: 5, text: '新車にダイヤモンドキーパーを施工していただきました。仕上がりの艶が凄くて大満足です。スタッフの方の説明も丁寧でした。', date: '2024-03' },
  { author: '鈴木花子', rating: 5, text: 'クリスタルキーパーで施工。雨の日の撥水が気持ちいいです。洗車も水洗いだけで綺麗になるので楽になりました。', date: '2024-02' },
  { author: '佐藤一郎', rating: 4, text: 'EXキーパーを施工。値段は張りますが3年メンテナンスフリーと考えるとコスパは良いと思います。', date: '2024-01' },
  { author: '高橋美咲', rating: 5, text: '3年前にダイヤモンドキーパーを施工し、今回メンテナンスで来店。まだまだ綺麗で驚きました。', date: '2023-12' },
  { author: '渡辺健太', rating: 4, text: 'フレッシュキーパーをお願いしました。手頃な価格で十分な効果。毎年お願いしようと思います。', date: '2023-11' },
];

const FAQ = [
  { q: 'コーティングの施工時間はどのくらいですか？', a: 'コースにより異なりますが、クリスタルキーパーで約2時間、ダイヤモンドキーパーで約4時間、EXキーパーで約1日です。朝お預けいただき夕方お引渡しが一般的です。' },
  { q: '新車でもコーティングは必要ですか？', a: 'はい、新車の状態が最も美しいため、その状態を維持するためにコーティングは非常に効果的です。新車時の施工が最もコストパフォーマンスが高いです。' },
  { q: '雨の日でも施工できますか？', a: '室内ブースがある店舗では天候に関係なく施工可能です。ブースがない店舗でも、屋根付きスペースで対応いたします。' },
  { q: 'メンテナンスは必ず必要ですか？', a: 'コースにより異なります。クリスタルキーパーは年1回の再施工、ダイヤモンドキーパーは年1回のメンテナンス推奨（なしでも3年持続）、EXキーパーは3年間メンテナンスフリーです。' },
  { q: '他店のコーティングの上から施工できますか？', a: 'はい、可能です。既存のコーティングの状態を確認し、必要に応じて下地処理を行ってから施工します。' },
  { q: '予約なしでも施工できますか？', a: 'Web予約をおすすめしています。予約限定の割引特典が適用されるほか、確実にご希望の日時で施工できます。' },
];

function StarRating({ rating }: { rating: number }) {
  return <span className="text-amber-500">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function V3ReviewsPage() {
  const { slug: storeId } = useParams<{ slug: string }>();
  const base = `/${storeId}`;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const avg = (SAMPLE_REVIEWS.reduce((s, r) => s + r.rating, 0) / SAMPLE_REVIEWS.length).toFixed(1);

  return (
    <main>
      <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>お客様の声・Q&A</h1>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-[#0C3290]">{avg}</div>
            <StarRating rating={Math.round(Number(avg))} />
            <p className="text-xs text-gray-400 mt-1">{SAMPLE_REVIEWS.length}件のレビュー</p>
          </div>
          <div className="space-y-4">
            {SAMPLE_REVIEWS.map((r, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-[#0C3290]">{r.author}</div>
                  <div className="text-xs text-gray-400">{r.date}</div>
                </div>
                <StarRating rating={r.rating} />
                <p className="text-sm text-gray-600 mt-2">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-5 bg-gray-50">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-xl font-bold text-[#0C3290] text-center mb-8" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>よくあるご質問</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between cursor-pointer hover:bg-gray-50">
                  <span className="text-sm font-semibold text-[#0C3290]">Q. {item.q}</span>
                  <span className="text-gray-400 text-lg ml-2">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600">A. {item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-5 bg-[#0C3290]">
        <div className="max-w-[500px] mx-auto text-center text-white">
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>コーティングをご検討中の方へ</h2>
          <div className="flex gap-3 justify-center">
            <Link href={`${base}/booking`} className="px-6 py-2.5 bg-amber-500 text-[#0C3290] font-bold rounded-md text-sm hover:bg-amber-500">予約する →</Link>
            <Link href={`${base}/booking?mode=inquiry`} className="px-6 py-2.5 bg-white/10 border border-white/15 text-white font-semibold rounded-md text-sm hover:bg-white/20">お問い合わせ</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
