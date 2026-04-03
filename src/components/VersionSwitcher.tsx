'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function VersionSwitcher() {
  const pathname = usePathname();

  // Detect which version we're on
  const isV1 = pathname.startsWith('/stores') || /^\/[^/]+\/(price|coatings|booking|cases|access|options|guide|reviews|privacy)/.test(pathname) || /^\/(?!admin|api|blog|price|coatings|booking|cases|privacy|stores)[^/]+$/.test(pathname);
  const isStores = pathname === '/stores';

  // Map v1 to v2
  const v1ToV2 = '/';
  const v2ToV1 = '/stores';

  // Don't show on admin
  if (pathname.startsWith('/admin')) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-1 bg-[#0f1c2e] rounded-full p-1 shadow-2xl border border-white/10">
      <Link
        href="/"
        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
          !isV1 ? 'bg-amber-500 text-white' : 'text-white/50 hover:text-white'
        }`}
      >
        V2 Single
      </Link>
      <Link
        href="/stores"
        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
          isV1 ? 'bg-amber-500 text-white' : 'text-white/50 hover:text-white'
        }`}
      >
        V1 Multi
      </Link>
    </div>
  );
}
