'use client';

import { useState } from 'react';
import type { V3StoreData } from '@/lib/v3-types';
import type { CoatingTier } from '@/lib/types';
import { trackEvent } from '@/lib/track';
import GoogleAutoFill from './GoogleAutoFill';

interface Props {
  store: V3StoreData;
  stores?: V3StoreData[];
  tiers: CoatingTier[];
  preselectedTier?: string;
  prefillType?: string;
}

export default function InquiryForm({ store: initialStore, stores, tiers, preselectedTier, prefillType }: Props) {
  const isMultiStore = stores && stores.length > 1;
  const [selectedStoreId, setSelectedStoreId] = useState(initialStore.store_id);
  const store = isMultiStore ? (stores!.find(s => s.store_id === selectedStoreId) || initialStore) : initialStore;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const tierName = tiers.find(t => t.id === preselectedTier)?.name || '';
  const defaultMessage = prefillType === 'price' && tierName
    ? `${tierName}の料金について詳しく教えてください。`
    : '';
  const [message, setMessage] = useState(defaultMessage);
  const [selectedTier, setSelectedTier] = useState(preselectedTier || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [confirmEmailFailed, setConfirmEmailFailed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email !== emailConfirm) {
      setError('メールアドレスが一致しません');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.store_id,
          name, phone, email, message,
          selectedTier: selectedTier || undefined,
          vehicleInfo: vehicleInfo || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data: { id: string; emailWarnings?: string[] } = await res.json().catch(() => ({ id: '' }));
      setConfirmEmailFailed(Array.isArray(data.emailWarnings) && data.emailWarnings.includes('customer-confirmation'));
      trackEvent(store.store_id, 'inquiry');
      setDone(true);
    } catch {
      setError('送信に失敗しました。もう一度お試しください。');
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="py-20 px-5 text-center">
        <div className="max-w-[500px] mx-auto">
          <div className="text-5xl mb-4 text-blue-500">&#9993;</div>
          <h2 className="text-2xl font-bold text-[#0f1c2e] mb-2">お問い合わせを受け付けました</h2>
          {confirmEmailFailed ? (
            <p className="text-sm text-amber-600 mb-2">確認メールの送信に失敗しましたが、お問い合わせは正常に登録されています。</p>
          ) : (
            <p className="text-sm text-gray-500 mb-2">確認メールをお送りしました。</p>
          )}
          <p className="text-sm text-gray-500 mb-6">店舗担当者より追ってご連絡いたします。</p>
          {store.tel && (
            <p className="text-xs text-gray-400">お急ぎの場合: <a href={`tel:${store.tel}`} className="text-amber-600 font-bold">{store.tel}</a></p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-5">
      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Store selector for multi-store */}
          {isMultiStore && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">店舗を選択 *</label>
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {stores!.map(s => (
                  <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Coating tier dropdown */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">ご検討中のコース（任意）</label>
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">-- 選択してください --</option>
              {tiers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <h2 className="text-lg font-bold text-[#0f1c2e] pt-2" style={{ fontFamily: '"Noto Serif JP", serif' }}>お客様情報</h2>
          <GoogleAutoFill onAutoFill={({ name: n, email: e }) => { setName(n); setEmail(e); setEmailConfirm(e); }} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">お名前 *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">電話番号 *</label>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メールアドレス *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メールアドレス（確認） *</label>
            <input type="email" required value={emailConfirm} onChange={e => setEmailConfirm(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                emailConfirm && email !== emailConfirm ? 'border-red-400' : 'border-gray-300 focus:border-blue-500'
              }`} />
            {emailConfirm && email !== emailConfirm && (
              <p className="text-[10px] text-red-500 mt-1">メールアドレスが一致しません</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">車種・年式（任意）</label>
            <input type="text" value={vehicleInfo} onChange={e => setVehicleInfo(e.target.value)}
              placeholder="例: トヨタ プリウス 2024年式"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">お問い合わせ内容 *</label>
            <textarea required rows={4} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="ご質問やご希望をお聞かせください"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg text-sm cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-50">
            {submitting ? '送信中...' : 'お問い合わせを送信'}
          </button>
        </form>

        {store.tel && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-500 mb-3">お電話でもお気軽にどうぞ</p>
            <a href={`tel:${store.tel}`} onClick={() => trackEvent(store.store_id, 'phone_call')} className="text-2xl font-bold text-amber-600">{store.tel}</a>
            {store.business_hours && <p className="text-xs text-gray-400 mt-1">{store.business_hours}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
