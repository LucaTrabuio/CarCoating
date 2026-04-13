'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingCalendar from '@/components/BookingCalendar';
import type { V3StoreData } from '@/lib/v3-types';
import { trackEvent } from '@/lib/track';

export default function BookingContent({ store }: { store: V3StoreData }) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isInquiry = mode === 'inquiry';
  const storeId = store.store_id;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    trackEvent(storeId, isInquiry ? 'inquiry' : 'booking');
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="py-20 px-5 text-center">
        <div className="max-w-[500px] mx-auto">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-[#0C3290] mb-2">
            {isInquiry ? 'お問い合わせを受け付けました' : '仮予約を受け付けました'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">担当者より折り返しご連絡いたします。</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section className="bg-[#0C3290] py-6 md:py-12 px-5 text-center">
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
          {isInquiry ? 'お問い合わせ' : 'ご予約'}
        </h1>
        <p className="text-white/40 text-sm mt-1">{store.store_name}</p>
      </section>

      <section className="py-4 px-5 bg-gray-50 border-b border-gray-200">
        <div className="max-w-[700px] mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold text-[#0C3290] text-sm">{store.store_name}</div>
            <div className="text-xs text-gray-500">{store.address}</div>
          </div>
        </div>
      </section>

      <section className="py-10 px-5">
        <div className="max-w-[700px] mx-auto">
          {!isInquiry && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[#0C3290] mb-4" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>希望日時を選択</h2>
              <BookingCalendar />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-[#0C3290]" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
              {isInquiry ? 'お問い合わせ内容' : 'お客様情報'}
            </h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">お名前 *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">電話番号 *</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">メールアドレス</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            {isInquiry && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">お問い合わせ内容</label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
              </div>
            )}
            <button type="submit"
              className="w-full py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer">
              {isInquiry ? '送信する' : '仮予約する'}
            </button>
          </form>

          <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-500 mb-3">お電話でもお気軽にどうぞ</p>
            {store.tel && <a href={`tel:${store.tel}`} onClick={() => trackEvent(storeId, 'phone_call')} className="text-2xl font-bold text-amber-500">{store.tel}</a>}
            {store.business_hours && <p className="text-xs text-gray-400 mt-1">{store.business_hours}</p>}
            {store.line_url && (
              <a href={store.line_url} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEvent(storeId, 'line_click')}
                className="inline-block mt-3 px-5 py-2 bg-[#06c755] text-white font-bold rounded-lg text-sm">
                LINEで相談
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
