'use client';

import { useEffect, useState } from 'react';

export interface NavBadgeCounts {
  tickets: number;
  inquiries: number;
  bookings: number;
}

const POLL_MS = 60_000;

// Polls the three admin count endpoints and returns the latest counts.
// Mirrors the original ticket-badge fetch pattern (see git log on
// AdminSidebar.tsx for context). Errors are swallowed at the endpoint
// level (responses default to `{ count: 0 }`), so this hook only has
// to handle network failure — it falls back to leaving the prior
// count in place rather than flickering badges to zero.
export function useNavBadges(): NavBadgeCounts {
  const [counts, setCounts] = useState<NavBadgeCounts>({ tickets: 0, inquiries: 0, bookings: 0 });

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      try {
        const [tRes, iRes, bRes] = await Promise.all([
          fetch('/api/admin/tickets/count', { cache: 'no-store' }),
          fetch('/api/admin/inquiries/count', { cache: 'no-store' }),
          fetch('/api/admin/bookings/count', { cache: 'no-store' }),
        ]);
        const [t, i, b] = await Promise.all([
          tRes.ok ? tRes.json() : { open: 0 },
          iRes.ok ? iRes.json() : { open: 0 },
          bRes.ok ? bRes.json() : { pending: 0 },
        ]);
        if (mounted) {
          setCounts({
            tickets: Number(t.open) || 0,
            inquiries: Number(i.open) || 0,
            bookings: Number(b.pending) || 0,
          });
        }
      } catch {
        // network failure — leave previous counts in place
      }
    }

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return counts;
}

export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count}
    </span>
  );
}
