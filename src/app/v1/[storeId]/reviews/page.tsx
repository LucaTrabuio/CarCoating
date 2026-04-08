'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SAMPLE_REVIEWS = [
  {
    author: '田中 T.',
    rating: 5,
    text: '新車のような仕上がりに大変満足しています。スタッフの方の丁寧な説明も好印象でした。ダイヤモンドキーパーを施工しましたが、3ヶ月経った今でも水弾きが素晴らしいです。',
    date: '2026年3月',
    car: 'トヨタ ハリアー',
    coating: 'ダイヤモンドキーパー',
  },
  {
    author: '鈴木 S.',
    rating: 5,
    text: 'クリスタルキーパーでお願いしました。青空駐車ですが、雨の後の汚れがほとんど付かなくなりました。コスパも良く、次回もリピート確定です。',
    date: '2026年2月',
    car: 'ホンダ フィット',
    coating: 'クリスタルキーパー',
  },
  {
    author: '佐藤 M.',
    rating: 4,
    text: '経年車で5年落ちでしたが、研磨+ダイヤⅡキーパーで見違えるほどキレイになりました。妻にも褒められました。メンテナンス時期もLINEでお知らせいただけるとのことで安心です。',
    date: '2026年2月',
    car: 'BMW 3シリーズ',
    coating: 'ダイヤⅡキーパー',
  },
  {
    author: '高橋 K.',
    rating: 5,
    text: 'EXキーパーを施工。正直、この価格でここまでの仕上がりは他では考えられません。ディーラーのコーティングと比べてもツヤの深さが全然違います。',
    date: '2026年1月',
    car: 'レクサス RX',
    coating: 'EXキーパー',
  },
  {
    author: '山本 Y.',
    rating: 4,
    text: '初めてのコーティングで不安でしたが、スタッフの方が丁寧に各コースの違いを説明してくれました。フレッシュキーパーですが十分満足です。',
    date: '2026年1月',
    car: '日産 ノート',
    coating: 'フレッシュキーパー',
  },
];

const FAQ_ITEMS = [
  {
    q: 'コーティングにはどのくらい時間がかかりますか？',
    a: 'コースにより異なります。クリスタルキーパーで約2時間、ダイヤモンドキーパーで約1日（日帰りOK）、EXキーパーで1〜2日です。お預かり中は代車のご用意も可能です（要予約）。',
  },
  {
    q: '施工後すぐに洗車しても大丈夫ですか？',
    a: 'KeePer コーティングは施工直後から完全硬化しておりますので、施工当日から洗車可能です。水洗いまたはカーシャンプーでの手洗い洗車を推奨します。',
  },
  {
    q: '駐車場はありますか？',
    a: '各店舗に専用駐車場をご用意しております。詳しくはアクセスページをご確認ください。',
  },
  {
    q: '予約なしでも施工できますか？',
    a: 'クリスタルキーパーは当日施工も対応可能な場合がございます。ダイヤモンドキーパー以上のコースは事前予約をお願いしております。Webまたはお電話でご予約ください。',
  },
  {
    q: 'メンテナンスは必要ですか？',
    a: 'コースにより異なります。クリスタルキーパー・フレッシュキーパーは年1回の再施工で美観を維持。ダイヤモンドキーパー以上はメンテナンスなしでも3年持続しますが、年1回のメンテナンスで最大5〜6年間持続します。',
  },
  {
    q: 'Web割引は他のキャンペーンと併用できますか？',
    a: '基本的にWeb予約割引は他のキャンペーンと併用可能です。詳しくは店舗スタッフまでお問い合わせください。',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= rating ? 'text-amber-400' : 'text-gray-200'}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default function StoreReviewsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const avgRating = (
    SAMPLE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / SAMPLE_REVIEWS.length
  ).toFixed(1);

  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#0f1c2e] pt-4 pb-6 px-5 text-center">
        <h1
          className="text-white text-xl font-bold"
          style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
        >
          お客様の声・よくある質問
        </h1>
        <p className="text-white/50 text-sm mt-1">Reviews & FAQ</p>
      </section>

      {/* REVIEWS */}
      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto">
          {/* Summary */}
          <div className="text-center mb-8">
            <div className="text-4xl font-bold text-[#0f1c2e]">{avgRating}</div>
            <StarRating rating={Math.round(Number(avgRating))} />
            <p className="text-xs text-gray-400 mt-1">{SAMPLE_REVIEWS.length}件のレビュー</p>
          </div>

          {/* Review cards */}
          <div className="space-y-4 mb-12">
            {SAMPLE_REVIEWS.map((review, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm text-[#0f1c2e]">
                      {review.author}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {review.date}
                    </span>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                <div className="flex gap-2 mb-2">
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {review.car}
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                    {review.coating}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.text}
                </p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <h2
            className="text-lg font-bold text-[#0f1c2e] text-center mb-6"
            style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
          >
            よくある質問
          </h2>
          <div className="space-y-2 mb-10">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#0f1c2e] pr-4">
                    Q. {item.q}
                  </span>
                  <span className="text-gray-400 text-lg flex-shrink-0">
                    {openFaq === i ? '-' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      A. {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-[#0f1c2e] rounded-xl p-8 text-center text-white">
            <h3 className="font-bold text-lg mb-1">
              お問い合わせ・ご予約はこちら
            </h3>
            <p className="text-sm opacity-60 mb-4">
              まずはお気軽にご相談ください
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href={`/${storeId}/booking`}
                className="px-5 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-lg text-sm"
              >
                予約する →
              </Link>
              <Link
                href={`/${storeId}/booking?mode=inquiry`}
                className="px-5 py-2.5 bg-white text-[#0f1c2e] font-bold rounded-lg text-sm"
              >
                お問い合わせ →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
