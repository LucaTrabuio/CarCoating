'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingCalendar from '@/components/BookingCalendar';
import StoreMap from '@/components/StoreMap';
import { coatingTiers } from '@/data/coating-tiers';
import { StoreData } from '@/lib/types';

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-400">読み込み中...</div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'inquiry' ? 'inquiry' : 'booking';
  const recommendedTierId = searchParams.get('recommended');
  const recommendedTier = recommendedTierId
    ? coatingTiers.find((t) => t.id === recommendedTierId)
    : null;

  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  // Contact form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((data: StoreData[]) => {
        setStores(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  // --- STEP: Confirmation ---
  if (submitted && selectedStore) {
    return (
      <main className="py-20 px-5 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-[#0f1c2e] mb-2">
            {mode === 'inquiry'
              ? 'お問い合わせを受け付けました'
              : '仮予約を受け付けました'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {selectedStore.store_name}のスタッフからご連絡いたします。
          </p>
          <div className="bg-gray-50 rounded-xl p-6 text-left text-sm space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">店舗</span>
              <span className="font-semibold">{selectedStore.store_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">お名前</span>
              <span className="font-semibold">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">電話番号</span>
              <span className="font-semibold">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">メール</span>
              <span className="font-semibold">{email}</span>
            </div>
            {recommendedTier && (
              <div className="flex justify-between">
                <span className="text-gray-500">おすすめプラン</span>
                <span className="font-semibold">{recommendedTier.name}</span>
              </div>
            )}
            {mode === 'inquiry' && message && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-500 block mb-1">
                  お問い合わせ内容
                </span>
                <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            連絡先: {selectedStore.email}
          </p>
          <a
            href="/"
            className="text-amber-600 font-semibold text-sm hover:underline"
          >
            ← トップページに戻る
          </a>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="py-8 px-5">
        <div className="max-w-[600px] mx-auto">
          {/* HEADER */}
          <div className="text-center mb-6">
            <h1
              className="text-xl font-bold text-[#0f1c2e]"
              style={{ fontFamily: 'var(--font-noto-serif-jp), serif' }}
            >
              {mode === 'inquiry' ? 'お問い合わせ' : 'ご予約（仮予約）'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'inquiry'
                ? 'お気軽にご相談ください'
                : 'まず店舗を選択し、希望日時をお選びください'}
            </p>
          </div>

          {/* RECOMMENDED TIER BADGE */}
          {recommendedTier && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-xs text-amber-600 font-semibold mb-1">
                おすすめプラン
              </p>
              <p className="text-base font-bold text-[#0f1c2e]">
                {recommendedTier.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {recommendedTier.tagline}
              </p>
            </div>
          )}

          {/* STEP 1: STORE SELECTION WITH MAP */}
          {!selectedStore && (
            <>
              <h2 className="text-base font-bold mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full mr-2">
                  1
                </span>
                お近くの店舗を選択
              </h2>
              <p className="text-xs text-slate-400 mb-4">地図で場所を確認し、ご希望の店舗をタップしてください</p>

              {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">店舗情報を読み込み中...</p>
              ) : stores.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">店舗情報が見つかりません。</p>
              ) : (
                <StoreMap stores={stores} selectedStore={selectedStore} onSelect={setSelectedStore} />
              )}
            </>
          )}

          {/* STEP 2: FORM */}
          {selectedStore && !submitted && (
            <>
              {/* Selected store indicator */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-0.5">
                    選択中の店舗
                  </p>
                  <p className="font-bold text-[#0f1c2e]">
                    {selectedStore.store_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedStore.address}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="text-xs text-amber-600 font-semibold hover:underline flex-shrink-0"
                >
                  変更
                </button>
              </div>

              <h2 className="text-base font-bold mb-4">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full mr-2">
                  2
                </span>
                {mode === 'inquiry'
                  ? 'お問い合わせ内容'
                  : '希望日時・ご連絡先'}
              </h2>

              {/* BOOKING MODE: Calendar + contact */}
              {mode === 'booking' && (
                <>
                  <p className="text-xs text-gray-400 mb-4">
                    カレンダーの日付をタップ → 時間帯を選択（第1〜第3希望）
                  </p>
                  <BookingCalendar holidays={[]} />
                </>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit}>
                <div
                  className={
                    mode === 'booking'
                      ? 'mt-8 pt-6 border-t border-gray-200'
                      : ''
                  }
                >
                  <h3 className="text-sm font-bold mb-4">ご連絡先</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        お名前{' '}
                        <span className="text-red-500">必須</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none"
                        placeholder="山田 太郎"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        電話番号{' '}
                        <span className="text-red-500">必須</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none"
                        placeholder="090-xxxx-xxxx"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold mb-1">
                      メールアドレス{' '}
                      <span className="text-red-500">必須</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>

                  {/* INQUIRY MODE: message textarea */}
                  {mode === 'inquiry' && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold mb-1">
                        お問い合わせ内容
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:outline-none resize-none"
                        placeholder="ご質問やご要望をご記入ください"
                      />
                    </div>
                  )}
                </div>

                {/* SUBMIT */}
                <div className="mt-6 text-center">
                  <button
                    type="submit"
                    className="w-full px-8 py-4 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity"
                  >
                    {mode === 'inquiry'
                      ? 'この内容で問い合わせる'
                      : 'この内容で空き状況を確認する（仮予約）'}
                  </button>
                  <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                    {mode === 'inquiry' ? (
                      <>
                        ※ 店舗スタッフより折り返しご連絡いたします。
                      </>
                    ) : (
                      <>
                        ※ まだ予約は確定していません。
                        <br />
                        店舗スタッフより折り返しご連絡し、確定となります。
                      </>
                    )}
                  </p>
                </div>
              </form>

              {/* ALTERNATIVE */}
              <div className="mt-8 p-5 bg-gray-50 rounded-xl text-center">
                <p className="text-sm font-semibold mb-2">
                  フォームが面倒な方は
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {selectedStore.line_url && (
                    <a
                      href={selectedStore.line_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#06c755] text-white font-bold rounded-lg text-sm"
                    >
                      LINEで予約
                    </a>
                  )}
                  <a
                    href={`tel:${selectedStore.tel}`}
                    className="px-4 py-2 bg-[#0f1c2e] text-white font-bold rounded-lg text-sm"
                  >
                    &#9742; {selectedStore.tel}
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
