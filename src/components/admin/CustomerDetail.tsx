'use client';

import { useState, useEffect } from 'react';

interface CustomerRecord {
  email: string;
  name: string;
  nameKana?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  bookingCount: number;
  inquiryCount: number;
  lastInteractionAt: string;
  createdAt: string;
}

interface CustomerDetailProps {
  storeId: string;
  email: string;
  onClose: () => void;
  onPiiExpired: () => void;
}

export function CustomerDetail({ storeId, email, onClose, onPiiExpired }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = `/api/admin/customers/${encodeURIComponent(email)}?storeId=${encodeURIComponent(storeId)}`;
    fetch(url)
      .then(async (res) => {
        if (res.status === 403) {
          onPiiExpired();
          return;
        }
        if (!res.ok) {
          setError('取得に失敗しました');
          return;
        }
        const data = await res.json();
        setCustomer(data.customer);
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, storeId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">顧客詳細</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
        </div>

        {loading && <p className="text-sm text-gray-500">読み込み中...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {customer && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">メール</span>
                <p className="font-medium text-gray-900">{customer.email}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">名前</span>
                <p className="font-medium text-gray-900">{customer.name || '-'}</p>
              </div>
              {customer.nameKana && (
                <div>
                  <span className="text-gray-500 text-xs">フリガナ</span>
                  <p className="text-gray-900">{customer.nameKana}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <span className="text-gray-500 text-xs">電話</span>
                  <p className="text-gray-900">{customer.phone}</p>
                </div>
              )}
              {customer.postalCode && (
                <div>
                  <span className="text-gray-500 text-xs">郵便番号</span>
                  <p className="text-gray-900">{customer.postalCode}</p>
                </div>
              )}
              {customer.address && (
                <div className="col-span-2">
                  <span className="text-gray-500 text-xs">住所</span>
                  <p className="text-gray-900">{customer.address}</p>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <span className="text-gray-500 text-xs block">予約数</span>
                <span className="font-bold text-lg">{customer.bookingCount}</span>
              </div>
              <div className="text-center">
                <span className="text-gray-500 text-xs block">問い合わせ数</span>
                <span className="font-bold text-lg">{customer.inquiryCount}</span>
              </div>
              <div className="text-center">
                <span className="text-gray-500 text-xs block">最終インタラクション</span>
                <span className="text-xs">{customer.lastInteractionAt?.slice(0, 10) || '-'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
