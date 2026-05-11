'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { useNavBadges } from '@/components/admin/NavBadges';

interface StoreInfo {
  store_id: string;
  store_name: string;
  prefecture: string;
  city: string;
  is_active: boolean;
  sub_company_id?: string;
}

export default function AdminDashboard() {
  const user = useAdminAuth();
  const isSuper = user.role === 'super_admin';
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setStores(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleStores = useMemo(() => {
    if (isSuper) return stores;
    return stores.filter(s => user.managed_stores.includes(s.store_id));
  }, [stores, isSuper, user.managed_stores]);

  const activeStores = visibleStores.filter(s => s.is_active);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          ようこそ、{user.email} さん（{isSuper ? 'スーパー管理者' : '店舗管理者'}）
        </p>
      </div>

      <TodayTasks />

      {/* Background context: store inventory */}
      <div className={`grid ${isSuper ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-4 mb-8`}>
        <StatCard label={isSuper ? '登録店舗' : '担当店舗'} value={loading ? '...' : String(visibleStores.length)} />
        <StatCard label="アクティブ" value={loading ? '...' : String(activeStores.length)} />
        {isSuper && (
          <>
            <StatCard label="グループ" value={loading ? '...' : String(new Set(stores.map(s => s.sub_company_id).filter(Boolean)).size)} />
            <StatCard label="ロール" value="管理者" />
          </>
        )}
      </div>

      {/* Active store list — unchanged limits (8 super / 20 store_admin) */}
      {!loading && activeStores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-gray-900">
              {isSuper ? 'アクティブ店舗' : '担当店舗'}
            </h2>
            {isSuper && (
              <Link href="/admin/stores" className="text-xs text-blue-600 font-semibold hover:underline">全て見る →</Link>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {activeStores.slice(0, isSuper ? 8 : 20).map(s => (
              <div key={s.store_id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{s.store_name}</span>
                  <span className="text-xs text-gray-400 ml-2">{s.prefecture} {s.city}</span>
                </div>
                <Link href={`/admin/builder/${s.store_id}`} className="text-xs text-blue-600 hover:underline">編集 →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// "Today's tasks" panel — replaces the old QuickAction grid that simply
// duplicated the sidebar. Surfaces actionable counts from the same
// polled endpoints the sidebar badges use.
function TodayTasks() {
  const counts = useNavBadges();
  return (
    <div className="mb-8">
      <h2 className="font-bold text-sm text-gray-700 mb-3">今日のタスク</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TaskCard href="/admin/inquiries" label="新着お問い合わせ" count={counts.inquiries} icon="💬" />
        <TaskCard href="/admin/bookings" label="確認待ちの予約" count={counts.bookings} icon="📅" />
        <TaskCard href="/admin/tickets" label="未対応チケット" count={counts.tickets} icon="🎫" />
      </div>
    </div>
  );
}

function TaskCard({ href, label, count, icon }: { href: string; label: string; count: number; icon: string }) {
  const isEmpty = count <= 0;
  return (
    <Link
      href={href}
      className={`bg-white border rounded-xl p-4 transition-colors flex items-center gap-4 ${
        isEmpty ? 'border-gray-200 hover:border-gray-300' : 'border-amber-300 hover:border-amber-400'
      }`}
    >
      <div className="text-2xl" aria-hidden="true">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-2xl font-bold ${isEmpty ? 'text-gray-400' : 'text-[#0C3290]'}`}>
          {isEmpty ? '0件' : `${count}件`}
        </div>
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-[#0C3290]">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
