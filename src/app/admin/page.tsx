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
      <div className="page-head">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">
            ようこそ、{user.email} さん（{isSuper ? 'スーパー管理者' : '店舗管理者'}）
          </p>
        </div>
      </div>

      <TodayTasks />

      <div className="card mb-4">
        <h2 className="sec-label">店舗ステータス</h2>
        <div className={`grid ${isSuper ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'} gap-4`}>
          <StatCard label={isSuper ? '登録店舗' : '担当店舗'} value={loading ? '—' : String(visibleStores.length)} />
          <StatCard label="アクティブ" value={loading ? '—' : String(activeStores.length)} />
          {isSuper && (
            <>
              <StatCard label="グループ" value={loading ? '—' : String(new Set(stores.map(s => s.sub_company_id).filter(Boolean)).size)} />
              <StatCard label="ロール" value="管理者" />
            </>
          )}
        </div>
      </div>

      {!loading && activeStores.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="sec-label" style={{ marginBottom: 0 }}>
              {isSuper ? 'アクティブ店舗' : '担当店舗'}
            </h2>
            {isSuper && (
              <Link href="/admin/stores" className="text-xs text-[#0C3290] font-semibold hover:underline">全て見る →</Link>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {activeStores.slice(0, isSuper ? 8 : 20).map(s => (
              <div key={s.store_id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{s.store_name}</span>
                  <span className="text-xs text-gray-400 ml-2">{s.prefecture} {s.city}</span>
                </div>
                <Link href={`/admin/builder/${s.store_id}`} className="text-xs text-[#0C3290] hover:underline">編集 →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayTasks() {
  const counts = useNavBadges();
  return (
    <div className="card mb-4">
      <h2 className="sec-label">今日のタスク</h2>
      <div className="qa-grid">
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
    <Link href={href} className={`qa-btn ${isEmpty ? '' : 'has-work'}`}>
      <div className="qa-ico" aria-hidden="true">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="qa-label">{label}</div>
        <div className={`qa-value ${isEmpty ? 'empty' : ''}`}>
          {isEmpty ? '0件' : `${count}件`}
        </div>
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F5F5F5] rounded-md p-3 text-center">
      <div className="text-2xl font-bold text-[#0C3290] leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
