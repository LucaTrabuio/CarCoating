'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminNav } from './AdminSidebar';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Slide-in drawer wrapping the same <AdminNav /> shown in the desktop
// sidebar. Closes on Esc, on overlay click, and whenever the route
// changes (driven by usePathname()).
export function AdminMobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pathname; onClose identity isn't relevant
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      id="admin-mobile-drawer"
      className={`md:hidden fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[260px] flex-col text-white shadow-xl transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#0C3290' }}
        role="dialog"
        aria-label="管理画面メニュー"
      >
        <div className="shrink-0 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">管理画面</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <AdminNav onNavigate={onClose} />
        </div>
      </aside>
    </div>
  );
}
