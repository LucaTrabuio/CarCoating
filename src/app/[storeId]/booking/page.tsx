'use client';

import { useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BookingCalendar from '@/components/BookingCalendar';
import { coatingTiers } from '@/data/coating-tiers';
import { formatPrice, getWebPrice, sizeLabels } from '@/lib/pricing';
import { CarSize } from '@/lib/types';
import Link from 'next/link';

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">読み込み中...</div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;

  // Inherited data from simulator
  const planId = searchParams.get('plan');
  const size = searchParams.get('size') as CarSize | null;
  const make = searchParams.get('make') ? decodeURIComponent(searchParams.get('make')!) : '';
  const model = searchParams.get('model') ? decodeURIComponent(searchParams.get('model')!) : '';

  const tier = planId ? coatingTiers.find(t => t.id === planId) : null;
  const webPrice = tier && size ? getWebPrice(tier, size, 20) : null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="py-20 px-5 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-[#0f1c2e] mb-2">仮予約を受け付けました</h1>
          <p className="text-sm text-gray-500 mb-6">
            まだ予約は確定していません。<br />
            店舗スタッフより折り返しご連絡し、確定となります。
          </p>
          <div className="bg-gray-50 rounded-xl p-6 text-left text-sm space-y-2 mb-6">
            <div className="flex justify-between"><span className="text-gray-500">お名前</span><span className="font-semibold">{name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">電話番号</span><span className="font-semibold">{phone}</span></div>
            {tier && <div className="flex justify-between"><span className="text-gray-500">プラン</span><span className="font-semibold">{tier.name}</span></div>}
            {make && <div className="flex justify-between"><span className="text-gray-500">車種</span><span className="font-semibold">{make} {model}</span></div>}
          </div>
          <Link href={`/${storeId}`} className="text-amber-600 font-semibold text-sm hover:underline">← トップページに戻る</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="py-8 px-5">
        <div className="max-w-[500px] mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#0f1c2e]" style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}>
              ご予約（仮予約）
            </h1>
            <p className="text-sm text-gray-500 mt-1">希望日時を3つまでお選びください</p>
          </div>

          {/* INHERITED DATA */}
          {tier && size && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <div className="text-xs font-semibold text-gray-400 mb-2">シミュレーター選択内容（自動引き継ぎ）</div>
              <div className="space-y-1.5 text-sm">
                {make && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">車種</span>
                    <span className="font-semibold">{make} {model}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">サイズ</span>
                  <span className="font-semibold">{size}（{sizeLabels[size].split('（')[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">プラン</span>
                  <span className="font-semibold">{tier.name}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                  <span className="text-gray-500">お見積もり</span>
                  <span className="font-bold text-lg text-amber-700">{formatPrice(webPrice!)}</span>
                </div>
              </div>
              <Link href={`/${storeId}/price`} className="text-xs text-amber-600 mt-2 inline-block hover:underline">
                ← シミュレーターで内容を変更する
              </Link>
            </div>
          )}

          {!tier && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-amber-800 mb-2">プランが選択されていません</p>
              <Link href={`/${storeId}/price`} className="text-sm text-amber-600 font-semibold hover:underline">
                見積もりシミュレーターでプランを選ぶ →
              </Link>
            </div>
          )}

          {/* CALENDAR */}
          <h2 className="text-base font-bold mb-1">ご希望日時を選択</h2>
          <p className="text-xs text-gray-400 mb-4">カレンダーの日付をタップ → 時間帯を選択（第1〜第3希望）</p>

          <BookingCalendar holidays={[]} />

          {/* CONTACT INFO */}
          <form onSubmit={handleSubmit}>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-base font-bold mb-4">ご連絡先</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">お名前 <span className="text-red-500">必須</span></label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="山田 太郎" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">電話番号 <span className="text-red-500">必須</span></label>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="090-xxxx-xxxx" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold mb-1">メールアドレス <span className="text-red-500">必須</span></label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="email@example.com" />
              </div>
            </div>

            {/* SUBMIT */}
            <div className="mt-6 text-center">
              <button type="submit"
                className="w-full px-8 py-4 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity">
                この内容で空き状況を確認する（仮予約）
              </button>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                ※ まだ予約は確定していません。<br />
                店舗スタッフより折り返しご連絡し、確定となります。
              </p>
            </div>
          </form>

          {/* ALTERNATIVE */}
          <div className="mt-8 p-5 bg-gray-50 rounded-xl text-center">
            <p className="text-sm font-semibold mb-2">フォームが面倒な方は</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="#" className="px-4 py-2 bg-[#06c755] text-white font-bold rounded-lg text-sm">LINEで予約</a>
              <a href="#" className="px-4 py-2 bg-[#0f1c2e] text-white font-bold rounded-lg text-sm">&#9742; 電話予約</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
