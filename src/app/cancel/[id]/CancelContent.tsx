'use client';

import { useState } from 'react';

export default function CancelContent({ reservationId }: { reservationId: string }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    if (!confirm('本当に予約をキャンセルしますか？')) return;
    setCancelling(true);
    setError('');
    try {
      const res = await fetch(`/api/cancel/${reservationId}`, { method: 'POST' });
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
        <div className="text-4xl mb-3">✓</div>
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
