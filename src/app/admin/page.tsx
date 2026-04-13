'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

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
      .then(r => r.ok ? r.json() : [])
      .then(data => setStores(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter stores for store_admin
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

      {/* Stats */}
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

      {/* Quick actions — only show pages the user can access */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <QuickAction href="/admin/bookings" icon="📅" title="予約管理" desc="予約リクエストの確認" />
        <QuickAction href="/admin/inquiries" icon="💬" title="お問い合わせ" desc="お問い合わせの管理" />
        <QuickAction href="/admin/builder" icon="🎨" title="ページビルダー" desc="店舗ページの編集" />
        <QuickAction href="/admin/news" icon="📰" title="お知らせ管理" desc="お知らせを管理" />
        <QuickAction href="/admin/kpi" icon="📊" title="KPIダッシュボード" desc="電話・問い合わせ・予約の集計" />
        <QuickAction href="/admin/tickets" icon="🎫" title="チケット" desc="サポートチケット" />
        {isSuper && (
          <>
            <QuickAction href="/admin/stores" icon="🏪" title="店舗管理" desc="店舗データの確認・CSV管理" />
            <QuickAction href="/admin/campaigns" icon="🏷️" title="キャンペーン" desc="キャンペーン設定の変更" />
            <QuickAction href="/admin/users" icon="👥" title="ユーザー管理" desc="管理者アカウントの管理" />
            <QuickAction href="/admin/blog" icon="✍️" title="ブログ管理" desc="ブログ記事の作成・編集" />
            <QuickAction href="/admin/master" icon="⚙️" title="マスターデータ" desc="コース・アピールポイント管理" />
            <QuickAction href="/admin/diagnostics" icon="🩺" title="診断" desc="システム状態の確認" />
          </>
        )}
      </div>

      {/* Store list — only managed stores for store_admin */}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-[#0C3290]">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function QuickAction({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors">
      <div className="text-xl mb-1">{icon}</div>
      <div className="font-bold text-sm text-[#0C3290]">{title}</div>
      <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
    </Link>
  );
}
