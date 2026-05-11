'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from './AdminAuthProvider';
import { NAV_ITEMS } from './AdminSidebar';

interface Props {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

// Slim admin top bar. On mobile (< md) it carries the hamburger that
// opens the sidebar drawer. On all viewports it shows a breadcrumb of
// the current section and a compact user menu (email, role badge,
// logout, back-to-site). The bar's role-aware breadcrumb resolves the
// section by matching `usePathname()` against the exported NAV_ITEMS,
// so it stays in sync with the sidebar without a parallel mapping.
export function AdminTopBar({ drawerOpen, onToggleDrawer }: Props) {
  const user = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isSuper = user.role === 'super_admin';

  const current = NAV_ITEMS.find(i =>
    i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href),
  );

  async function handleLogout() {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      // proceed to redirect even if the call fails
    }
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-3 md:px-5">
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-expanded={drawerOpen}
        aria-controls="admin-mobile-drawer"
        aria-label={drawerOpen ? 'メニューを閉じる' : 'メニューを開く'}
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <nav aria-label="現在地" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900 truncate">
          管理画面
        </Link>
        {current && current.href !== '/admin' && (
          <>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900 truncate">{current.label}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-gray-500 truncate max-w-[180px]">{user.email}</span>
        <span
          className={`hidden sm:inline rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isSuper ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {isSuper ? 'Super' : 'Store'}
        </span>
        <Link
          href="/"
          className="hidden md:inline text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          サイトへ
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
