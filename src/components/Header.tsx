'use client';

import Link from 'next/link';
import { useState } from 'react';

interface HeaderProps {
  storeId: string;
  storeName: string;
  tel: string;
  lineUrl?: string;
}

export default function Header({ storeId, storeName, tel, lineUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/${storeId}`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1c2e]/97 backdrop-blur-md border-b border-white/[.06]">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center justify-between h-14">
        <Link href={base} className="flex items-center gap-2.5 text-white">
          <div className="w-7 h-7 rounded bg-amber-600/20 border border-dashed border-amber-600 flex items-center justify-center text-[10px] text-amber-600 font-bold">K</div>
          <span className="text-[13px] font-bold leading-tight">
            {storeName}
            <small className="block text-[10px] font-normal opacity-60">KeePer PRO SHOP</small>
          </span>
        </Link>

        <nav className="hidden md:flex gap-5">
          <Link href={base} className="text-white/60 text-[13px] hover:text-white transition-colors">ホーム</Link>
          <Link href={`${base}/coatings`} className="text-white/60 text-[13px] hover:text-white transition-colors">メニュー</Link>
          <Link href={`${base}/price`} className="text-white/60 text-[13px] hover:text-white transition-colors">見積もり</Link>
          <Link href={`${base}/cases`} className="text-white/60 text-[13px] hover:text-white transition-colors">施工事例</Link>
          <Link href={`${base}/booking`} className="text-white/60 text-[13px] hover:text-white transition-colors">ご予約</Link>
        </nav>

        <div className="flex items-center gap-2">
          {lineUrl && (
            <a href={lineUrl} target="_blank" rel="noopener noreferrer"
              className="text-white text-[11px] font-semibold px-3 py-1.5 rounded-md bg-white/[.08] border border-white/[.15] hover:bg-white/[.15] transition-colors">
              LINE
            </a>
          )}
          <a href={`tel:${tel}`}
            className="text-white text-[11px] font-bold px-3 py-1.5 rounded-md bg-gradient-to-br from-amber-600 via-amber-400 to-amber-700">
            &#9742; {tel}
          </a>
          <button
            className="md:hidden text-white text-xl ml-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="メニュー"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-[#0f1c2e] border-t border-white/[.06] px-5 py-4 flex flex-col gap-3">
          <Link href={base} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>ホーム</Link>
          <Link href={`${base}/coatings`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>コーティングメニュー</Link>
          <Link href={`${base}/price`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>見積もりシミュレーター</Link>
          <Link href={`${base}/cases`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>施工事例</Link>
          <Link href={`${base}/reviews`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>お客様の声・Q&A</Link>
          <Link href={`${base}/access`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>店舗情報</Link>
          <Link href={`${base}/booking`} className="text-white/80 text-sm font-bold text-amber-400" onClick={() => setMenuOpen(false)}>ご予約</Link>
        </nav>
      )}
    </header>
  );
}
