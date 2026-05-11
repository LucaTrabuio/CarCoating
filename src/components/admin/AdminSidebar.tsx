'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from './AdminAuthProvider';
import { useNavBadges, NavBadge } from './NavBadges';

export type NavGroup = 'daily' | 'content' | 'org' | 'system';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  group: NavGroup;
  superAdminOnly?: boolean;
  storeAdminVisible?: boolean;
}

// Exported so AdminTopBar can derive the breadcrumb label from pathname.
export const NAV_ITEMS: NavItem[] = [
  // Daily ops — what an admin opens every day
  { label: 'ダッシュボード', href: '/admin', icon: '▦', group: 'daily', storeAdminVisible: true },
  { label: '予約管理', href: '/admin/bookings', icon: '📅', group: 'daily', storeAdminVisible: true },
  { label: 'お問い合わせ', href: '/admin/inquiries', icon: '💬', group: 'daily', storeAdminVisible: true },
  { label: 'チケット', href: '/admin/tickets', icon: '🎫', group: 'daily', storeAdminVisible: true },

  // Content authoring
  { label: 'ページビルダー', href: '/admin/builder', icon: '🧱', group: 'content', storeAdminVisible: true },
  { label: 'バナーメーカー', href: '/admin/banners', icon: '📑', group: 'content', storeAdminVisible: true },
  { label: 'お知らせ管理', href: '/admin/news', icon: '📢', group: 'content', storeAdminVisible: true },
  { label: '施工事例', href: '/admin/cases', icon: '📸', group: 'content', superAdminOnly: true },
  { label: 'ブログ管理', href: '/admin/blog', icon: '✏️', group: 'content', superAdminOnly: true },
  { label: 'ブログ CSV', href: '/admin/blog/import', icon: '📝', group: 'content', superAdminOnly: true },
  { label: 'トップページ', href: '/admin/homepage', icon: '🏠', group: 'content', superAdminOnly: true },
  { label: 'キャンペーン', href: '/admin/campaigns', icon: '🎯', group: 'content', superAdminOnly: true },

  // Stores & organisation
  { label: '店舗マスター', href: '/admin/stores', icon: '🏪', group: 'org', superAdminOnly: true },
  { label: '店舗構成図', href: '/admin/hierarchy', icon: '🌳', group: 'org', superAdminOnly: true },
  { label: 'ユーザー管理', href: '/admin/users', icon: '👥', group: 'org', superAdminOnly: true },
  { label: 'CSVインポート', href: '/admin/stores/import', icon: '📥', group: 'org', storeAdminVisible: true },
  { label: 'インポート履歴', href: '/admin/imports', icon: '🕘', group: 'org', storeAdminVisible: true },

  // System / measurement
  { label: 'KPIダッシュボード', href: '/admin/kpi', icon: '📊', group: 'system', storeAdminVisible: true },
  { label: 'グローバルデフォルト', href: '/admin/defaults', icon: '🌐', group: 'system', superAdminOnly: true },
  { label: 'マスターデータ', href: '/admin/master', icon: '⚙️', group: 'system', superAdminOnly: true },
  { label: '診断', href: '/admin/diagnostics', icon: '🩺', group: 'system', superAdminOnly: true },
];

const GROUP_ORDER: NavGroup[] = ['daily', 'content', 'org', 'system'];
const GROUP_LABEL: Record<NavGroup, string> = {
  daily: '日々の業務',
  content: 'コンテンツ',
  org: '店舗・組織',
  system: 'システム',
};

const COLLAPSED_KEY = 'admin:nav:collapsed';

function readCollapsedFromStorage(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function isActiveHref(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

interface AdminNavProps {
  onNavigate?: () => void;
}

// Shared nav body, rendered both inside the desktop sidebar and the
// mobile drawer. Exporting the inner body (instead of the whole
// sidebar) keeps a single source of truth for grouping, badges, and
// active-state logic.
export function AdminNav({ onNavigate }: AdminNavProps) {
  const pathname = usePathname();
  const user = useAdminAuth();
  const isSuper = user.role === 'super_admin';
  const badges = useNavBadges();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsedFromStorage);

  function toggleGroup(group: NavGroup) {
    setCollapsed(prev => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // ignored — UI preference, not critical
      }
      return next;
    });
  }

  const visible = NAV_ITEMS.filter(item => {
    if (isSuper) return true;
    if (item.superAdminOnly) return false;
    return item.storeAdminVisible;
  });

  function badgeForHref(href: string): number {
    if (href === '/admin/tickets') return badges.tickets;
    if (href === '/admin/inquiries') return badges.inquiries;
    if (href === '/admin/bookings') return badges.bookings;
    return 0;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {GROUP_ORDER.map(group => {
        const items = visible.filter(i => i.group === group);
        if (items.length === 0) return null;
        const isCollapsed = collapsed[group] === true;
        return (
          <div key={group} className="mb-1">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center justify-between px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/70"
            >
              <span>{GROUP_LABEL[group]}</span>
              <span aria-hidden="true">{isCollapsed ? '+' : '−'}</span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {items.map(item => {
                  const active = isActiveHref(pathname, item.href);
                  const count = badgeForHref(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`relative flex items-center gap-3 rounded-md py-2 pr-3 text-sm transition-colors ${
                        active
                          ? 'bg-white/10 text-white font-medium border-l-2 border-amber-400 pl-[10px]'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white pl-3'
                      }`}
                    >
                      <span className="w-5 text-center">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      <NavBadge count={count} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminSidebar() {
  const router = useRouter();
  const user = useAdminAuth();
  const isSuper = user.role === 'super_admin';

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
      className="sticky top-0 hidden h-screen w-60 flex-shrink-0 self-start md:flex md:flex-col"
      style={{ backgroundColor: '#0C3290' }}
    >
      <div className="shrink-0 px-5 py-5">
        <h1 className="text-lg font-bold text-white">管理画面</h1>
        <p className="mt-1 truncate text-xs text-gray-400">{user.email}</p>
        {!isSuper && <p className="mt-0.5 text-[10px] text-amber-400">店舗管理者</p>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        <AdminNav />
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-4">
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
