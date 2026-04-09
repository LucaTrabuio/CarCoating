'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Store {
  store_id: string;
  store_name: string;
  prefecture: string;
  city: string;
  address: string;
  tel: string;
  is_active: boolean;
  sub_company_id?: string;
  store_slug?: string;
  has_booth?: boolean;
  level1_staff_count?: number;
  level2_staff_count?: number;
}

interface SubCompany {
  id: string;
  name: string;
  slug: string;
  stores: string[];
  description: string;
}

export default function HierarchyPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/v3/stores?all=true').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/sub-companies').then(r => r.ok ? r.json() : []),
    ])
      .then(([storeData, scData]) => {
        setStores(Array.isArray(storeData) ? storeData : []);
        const scs = Array.isArray(scData) ? scData : [];
        setSubCompanies(scs);
        // Expand all by default
        setExpandedGroups(new Set(scs.map((sc: SubCompany) => sc.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group stores
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

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">店舗構成図</h1>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const totalActive = stores.filter(s => s.is_active).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">店舗構成図</h1>
        <p className="text-sm text-gray-500 mt-1">
          全{stores.length}店舗（アクティブ: {totalActive}）・{subCompanies.length}グループ
        </p>
      </div>

      {/* Tree */}
      <div className="relative">
        {/* Root node */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0f1c2e] text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            K
          </div>
          <div>
            <div className="font-bold text-[#0f1c2e]">KeePer PRO SHOP ネットワーク</div>
            <div className="text-xs text-gray-500">{stores.length}店舗 ・ {subCompanies.length}サブカンパニー</div>
          </div>
        </div>

        <div className="ml-5 border-l-2 border-gray-200 pl-0">
          {/* Sub-company groups */}
          {subCompanies.map((sc, scIdx) => {
            const groupStores = grouped.get(sc.id) || [];
            const isExpanded = expandedGroups.has(sc.id);
            const isLast = scIdx === subCompanies.length - 1 && standalone.length === 0;

            return (
              <div key={sc.id} className="relative">
                {/* Horizontal connector */}
                <div className="absolute left-0 top-5 w-6 border-t-2 border-gray-200" />

                <div className={`ml-6 ${isLast && !isExpanded ? '' : 'mb-2'}`}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(sc.id)}
                    className="flex items-center gap-3 w-full text-left group py-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0f1c2e]">{sc.name}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">共有サイト</span>
                        <span className="text-[10px] text-gray-400">/{sc.slug}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{groupStores.length}店舗 — {sc.description || ''}</div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Link
                        href={`/${sc.slug}`}
                        target="_blank"
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold hover:bg-amber-200"
                      >
                        サイト
                      </Link>
                      {groupStores[0] && (
                        <Link
                          href={`/admin/builder/${groupStores[0].store_id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold hover:bg-gray-200"
                        >
                          編集
                        </Link>
                      )}
                    </div>
                  </button>

                  {/* Expanded store list */}
                  {isExpanded && groupStores.length > 0 && (
                    <div className="ml-4 border-l-2 border-blue-100 pl-0 mt-1 mb-2">
                      {groupStores.map((store, idx) => (
                        <StoreNode
                          key={store.store_id}
                          store={store}
                          isLast={idx === groupStores.length - 1}
                          connectorColor="border-blue-100"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Standalone stores */}
          {standalone.length > 0 && (
            <>
              {standalone.map((store, idx) => (
                <div key={store.store_id} className="relative">
                  <div className="absolute left-0 top-5 w-6 border-t-2 border-gray-200" />
                  <div className="ml-6">
                    <StoreNode
                      store={store}
                      isLast={idx === standalone.length - 1}
                      connectorColor="border-gray-200"
                      showBuilderLink
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreNode({
  store,
  isLast,
  connectorColor,
  showBuilderLink,
}: {
  store: Store;
  isLast: boolean;
  connectorColor: string;
  showBuilderLink?: boolean;
}) {
  return (
    <div className={`relative ${isLast ? '' : 'mb-1'}`}>
      {/* Horizontal connector */}
      <div className={`absolute left-0 top-4 w-4 border-t-2 ${connectorColor}`} />

      <div className="ml-4 flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
        {/* Store icon */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          store.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-400'
        }`}>
          {store.has_booth ? '🏢' : '🏪'}
        </div>

        {/* Store info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 truncate">{store.store_name}</span>
            {!store.is_active && (
              <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold">無効</span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span>{store.prefecture}{store.city}</span>
            {store.tel && <span>📞 {store.tel}</span>}
            {store.has_booth && <span className="text-amber-500">ブース有</span>}
            {(store.level1_staff_count || 0) > 0 && (
              <span>L1: {store.level1_staff_count}名</span>
            )}
            {(store.level2_staff_count || 0) > 0 && (
              <span>L2: {store.level2_staff_count}名</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {showBuilderLink && (
            <Link
              href={`/admin/builder/${store.store_id}`}
              className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold hover:bg-gray-200"
            >
              編集
            </Link>
          )}
          <Link
            href={`/${store.store_id}`}
            target="_blank"
            className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold hover:bg-gray-200"
          >
            表示
          </Link>
        </div>
      </div>
    </div>
  );
}
