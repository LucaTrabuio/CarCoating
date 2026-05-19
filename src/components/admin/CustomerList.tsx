'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminAuth } from './AdminAuthProvider';
import { PasswordReprompt } from './PasswordReprompt';
import { CustomerDetail } from './CustomerDetail';

interface CustomerRecord {
  email: string;
  name: string;
  nameKana?: string;
  phone?: string;
  bookingCount: number;
  inquiryCount: number;
  lastInteractionAt: string;
}

export function CustomerList() {
  const admin = useAdminAuth();
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<{ store_id: string; store_name: string }[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [piiUnlocked, setPiiUnlocked] = useState(false);
  const [showReprompt, setShowReprompt] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Clear PII flag on unmount (nav away)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setPiiUnlocked(false);
    };
  }, []);

  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const list = data.map((s: { store_id: string; store_name: string }) => ({
            store_id: s.store_id,
            store_name: s.store_name,
          }));
          setStores(list);
          if (list.length > 0 && !storeId) setStoreId(list[0].store_id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = useCallback(async () => {
    if (!storeId || !piiUnlocked) return;
    setLoading(true);
    try {
      const url = `/api/admin/customers?storeId=${encodeURIComponent(storeId)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url);
      if (res.status === 403) {
        setPiiUnlocked(false);
        setShowReprompt(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) setCustomers(data.customers ?? []);
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [storeId, q, piiUnlocked]);

  useEffect(() => {
    if (piiUnlocked) fetchCustomers();
  }, [piiUnlocked, fetchCustomers]);

  // Show reprompt when store changes
  useEffect(() => {
    if (storeId) {
      setPiiUnlocked(false);
      setCustomers([]);
      setShowReprompt(true);
    }
  }, [storeId]);

  function handleStepUpSuccess() {
    setShowReprompt(false);
    setPiiUnlocked(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">顧客管理</h1>
        <div className="flex items-center gap-2">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            {stores.map((s) => (
              <option key={s.store_id} value={s.store_id}>
                {s.store_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {piiUnlocked && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="メール・名前・電話で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? '...' : '検索'}
          </button>
          {admin.role === 'super_admin' && (
            <a
              href={`/api/admin/customers/export?storeId=${encodeURIComponent(storeId)}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              CSV出力
            </a>
          )}
        </div>
      )}

      {piiUnlocked && customers.length === 0 && !loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">顧客データがありません</p>
        </div>
      )}

      {piiUnlocked && customers.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">メール</th>
                <th className="px-4 py-2">名前</th>
                <th className="px-4 py-2">電話</th>
                <th className="px-4 py-2">予約</th>
                <th className="px-4 py-2">問合</th>
                <th className="px-4 py-2">最終</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr
                  key={c.email}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEmail(c.email)}
                >
                  <td className="px-4 py-2 text-gray-700">{c.email}</td>
                  <td className="px-4 py-2 text-gray-700">{c.name || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{c.phone || '-'}</td>
                  <td className="px-4 py-2 text-center">{c.bookingCount}</td>
                  <td className="px-4 py-2 text-center">{c.inquiryCount}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {c.lastInteractionAt?.slice(0, 10) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showReprompt && (
        <PasswordReprompt
          onSuccess={handleStepUpSuccess}
          onCancel={() => setShowReprompt(false)}
        />
      )}

      {selectedEmail && storeId && (
        <CustomerDetail
          storeId={storeId}
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onPiiExpired={() => {
            setPiiUnlocked(false);
            setShowReprompt(true);
          }}
        />
      )}
    </div>
  );
}
