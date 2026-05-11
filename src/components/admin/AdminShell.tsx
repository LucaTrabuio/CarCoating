'use client';

import { useState, type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminMobileDrawer } from './AdminMobileDrawer';

// Owns the mobile-drawer open/close state and stitches together the
// desktop sidebar, the mobile drawer, the top bar, and the page slot.
// Server-rendered admin layout.tsx wraps {children} with this client
// shell so navigation chrome is interactive without making every page
// a client component.
export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <AdminMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopBar drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen(o => !o)} />
        <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
