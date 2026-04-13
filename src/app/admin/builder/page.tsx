'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface Store {
  store_id: string;
  store_name: string;
  prefecture: string;
  city: string;
  is_active: boolean;
  sub_company_id?: string;
}

interface SubCompany {
  id: string;
  name: string;
  slug: string;
  stores: string[];
}

export default function BuilderPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v3/stores?all=true').then(r => r.ok ? r.json() : []),
      fetch('/api/v3/sub-companies').then(r => r.ok ? r.json() : []),
    ])
      .then(([storeData, scData]) => {
        let storeList: Store[] = Array.isArray(storeData) ? storeData : [];
        // Store admins only see their managed stores
        if (user.role === 'store_admin') {
          storeList = storeList.filter(s => user.managed_stores.includes(s.store_id));
        }
        setStores(storeList);
        setSubCompanies(Array.isArray(scData) ? scData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Group stores by sub_company_id
  const grouped = new Map<string, Store[]>();
  const standalone: Store[] = [];

  for (const store of stores) {
    if (store.sub_company_id) {
      if (!grouped.has(store.sub_company_id)) grouped.set(store.sub_company_id, []);
      grouped.get(store.sub_company_id)!.push(store);
    } else {
      standalone.push(store);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ページビルダー</h1>
      <p className="text-sm text-gray-500">編集したいサイトを選択してください</p>

      {loading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : stores.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">店舗がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Shared sites (one card per sub-company) */}
          {subCompanies.map(sc => {
            const groupStores = grouped.get(sc.id) || [];
            if (groupStores.length === 0) return null;
            const primaryStore = groupStores[0];
            return (
              <Link
                key={sc.id}
                href={`/admin/builder/${primaryStore.store_id}`}
                className="group rounded-xl border-2 border-blue-200 bg-white p-5 transition-shadow hover:shadow-md hover:border-amber-400"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-sm font-bold text-gray-900 group-hover:text-amber-500">
                    {sc.name}
                  </h2>
                  <span className="rounded bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold">
                    共有サイト
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {groupStores.length}店舗が共有 — /{sc.slug}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {groupStores.map(s => (
                    <span key={s.store_id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {s.store_name.replace('キーパープロショップ ', '').replace('キーパープロショップ', '')}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs font-medium text-amber-500 group-hover:text-amber-500">
                  ビルダーを開く &rarr;
                </p>
              </Link>
            );
          })}

          {/* Standalone stores (individual sites) */}
          {standalone.map(store => (
            <Link
              key={store.store_id}
              href={`/admin/builder/${store.store_id}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-sm font-bold text-gray-900 group-hover:text-amber-500">
                  {store.store_name}
                </h2>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {store.is_active ? '有効' : '無効'}
                </span>
              </div>
              {(store.prefecture || store.city) && (
                <p className="mt-1 text-xs text-gray-500">{store.prefecture}{store.city}</p>
              )}
              <p className="mt-3 text-xs font-medium text-amber-500 group-hover:text-amber-500">
                ビルダーを開く &rarr;
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
