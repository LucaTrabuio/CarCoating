'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDropdown, setMenuDropdown] = useState(false);

  return (
    <header className="fixed top-[36px] left-0 right-0 z-50 bg-[#0f1c2e]/97 backdrop-blur-md border-b border-white/[.06]">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center justify-between h-[52px]">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <div className="w-7 h-7 rounded bg-amber-600/20 border border-dashed border-amber-600 flex items-center justify-center text-[10px] text-amber-600 font-bold">K</div>
          <span className="text-[13px] font-bold leading-tight">
            KeePer PRO SHOP
            <small className="block text-[10px] font-normal opacity-60">カーコーティング専門店</small>
          </span>
        </Link>

        <nav className="hidden md:flex gap-5 items-center">
          <Link href="/" className="text-white/60 text-[13px] hover:text-white transition-colors">ホーム</Link>
          <div className="relative" onMouseEnter={() => setMenuDropdown(true)} onMouseLeave={() => setMenuDropdown(false)}>
            <button className="text-white/60 text-[13px] hover:text-white transition-colors cursor-pointer">メニュー ▾</button>
            {menuDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                <div className="bg-[#0f1c2e] border border-white/10 rounded-lg shadow-xl py-1.5 min-w-[180px]">
                  <Link href="/coatings" className="block px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setMenuDropdown(false)}>コーティングメニュー</Link>
                  <Link href="/price" className="block px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setMenuDropdown(false)}>オプション・料金</Link>
                </div>
              </div>
            )}
          </div>
          <Link href="/cases" className="text-white/60 text-[13px] hover:text-white transition-colors">施工事例</Link>
          <Link href="/blog" className="text-white/60 text-[13px] hover:text-white transition-colors">ブログ</Link>
          <Link href="/booking" className="text-white/60 text-[13px] hover:text-white transition-colors">ご予約</Link>
        </nav>

        <div className="flex items-center gap-2">
          <button className="md:hidden text-white text-xl ml-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="メニュー">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-[#0f1c2e] border-t border-white/[.06] px-5 py-4 flex flex-col gap-3">
          <Link href="/" className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>ホーム</Link>
          <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">メニュー</div>
          <Link href="/coatings" className="text-white/80 text-sm pl-3" onClick={() => setMenuOpen(false)}>コーティングメニュー</Link>
          <Link href="/price" className="text-white/80 text-sm pl-3" onClick={() => setMenuOpen(false)}>オプション・料金</Link>
          <Link href="/cases" className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>施工事例</Link>
          <Link href="/blog" className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>ブログ</Link>
          <Link href="/booking" className="text-white/80 text-sm font-bold text-amber-400" onClick={() => setMenuOpen(false)}>ご予約・お問い合わせ</Link>
        </nav>
      )}
    </header>
  );
}
