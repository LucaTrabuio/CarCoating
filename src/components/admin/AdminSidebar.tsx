'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from './AdminAuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  superAdminOnly?: boolean;
  storeAdminVisible?: boolean; // explicitly visible to store_admin
}

const NAV_ITEMS: NavItem[] = [
  // Store admin can see these
  { label: 'ダッシュボード', href: '/admin', icon: '▦', storeAdminVisible: true },
  { label: '予約管理', href: '/admin/bookings', icon: '📅', storeAdminVisible: true },
  { label: 'ページビルダー', href: '/admin/builder', icon: '🧱', storeAdminVisible: true },
  { label: 'お知らせ管理', href: '/admin/news', icon: '📢', storeAdminVisible: true },
  { label: 'KPIダッシュボード', href: '/admin/kpi', icon: '📊', storeAdminVisible: true },
  { label: 'チケット', href: '/admin/tickets', icon: '🎫', storeAdminVisible: true },
  // super_admin only
  { label: '店舗マスター', href: '/admin/stores', icon: '🏪', superAdminOnly: true },
  { label: '店舗構成図', href: '/admin/hierarchy', icon: '🌳', superAdminOnly: true },
  { label: '施工事例', href: '/admin/cases', icon: '📸', superAdminOnly: true },
  { label: 'トップページ', href: '/admin/homepage', icon: '🏠', superAdminOnly: true },
  { label: 'キャンペーン', href: '/admin/campaigns', icon: '🎯', superAdminOnly: true },
  { label: 'ブログ管理', href: '/admin/blog', icon: '✏️', superAdminOnly: true },
  { label: 'ユーザー管理', href: '/admin/users', icon: '👥', superAdminOnly: true },
  { label: 'マスターデータ', href: '/admin/master', icon: '⚙️', superAdminOnly: true },
  { label: '診断', href: '/admin/diagnostics', icon: '🩺', superAdminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAdminAuth();
  const [openTickets, setOpenTickets] = useState(0);

  const isSuper = user.role === 'super_admin';
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isSuper) return true;
    if (item.superAdminOnly) return false;
    return item.storeAdminVisible;
  });

  // Fetch open ticket count for badge
  useEffect(() => {
    let mounted = true;
    function fetchCount() {
      fetch('/api/admin/tickets/count', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (mounted) setOpenTickets(d.open || 0); })
        .catch(() => {});
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      // proceed to redirect even if the call fails
    }
    router.push('/login');
  }

  return (
    <aside
      className="flex h-screen w-60 flex-shrink-0 flex-col justify-between"
      style={{ backgroundColor: '#0f1c2e' }}
    >
      {/* Header */}
      <div>
        <div className="px-5 py-5">
          <h1 className="text-lg font-bold text-white">管理画面</h1>
          <p className="mt-1 truncate text-xs text-gray-400">{user.email}</p>
          {!isSuper && (
            <p className="mt-0.5 text-[10px] text-amber-400">店舗管理者</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative ${
                  active
                    ? 'bg-amber-500 font-medium text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
                {item.href === '/admin/tickets' && openTickets > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {openTickets}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="w-5 text-center">←</span>
          サイトに戻る
        </Link>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="w-5 text-center">⏻</span>
          ログアウト
        </button>
      </div>
    </aside>
  );
}
