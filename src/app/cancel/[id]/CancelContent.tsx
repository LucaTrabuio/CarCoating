'use client';

import { useState } from 'react';

export default function CancelContent({ reservationId, token }: { reservationId: string; token?: string }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    if (!confirm('本当に予約をキャンセルしますか？')) return;
    setCancelling(true);
    setError('');
    try {
      const url = token ? `/api/cancel/${reservationId}?token=${token}` : `/api/cancel/${reservationId}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error();
      setCancelled(true);
    } catch {
      setError('キャンセルに失敗しました。お手数ですがお電話にてご連絡ください。');
    }
    setCancelling(false);
  }

  if (cancelled) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-green-50 text-green-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">予約をキャンセルしました。</p>
        <p className="text-xs text-gray-400 mt-2">確認メールをお送りしました。</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full py-3 bg-red-500 text-white font-bold rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 cursor-pointer"
      >
        {cancelling ? 'キャンセル中...' : '予約をキャンセルする'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
    </>
  );
}
