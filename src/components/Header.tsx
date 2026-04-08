'use client';

import Link from 'next/link';
import { useState } from 'react';
import { trackEvent } from '@/lib/track';

interface HeaderProps {
  storeId: string;
  storeName: string;
  tel: string;
  lineUrl?: string;
  basePath?: string;
}

export default function Header({ storeId, storeName, tel, lineUrl, basePath }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuDropdown, setMenuDropdown] = useState(false);
  const base = basePath || `/${storeId}`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f1c2e]/97 backdrop-blur-md border-b border-white/[.06]">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center justify-between h-14">
        <Link href={base} className="flex items-center gap-2.5 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/keeper-logo.png" alt="KeePer" className="h-7" />
          <span className="text-[13px] font-bold leading-tight">
            {storeName}
          </span>
        </Link>

        <nav className="hidden md:flex gap-5 items-center">
          <Link href={base} className="text-white/60 text-[13px] hover:text-white transition-colors">ホーム</Link>

          {/* Menu dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setMenuDropdown(true)}
            onMouseLeave={() => setMenuDropdown(false)}
          >
            <button className="text-white/60 text-[13px] hover:text-white transition-colors cursor-pointer">
              メニュー ▾
            </button>
            {menuDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                <div className="bg-[#0f1c2e] border border-white/10 rounded-lg shadow-xl py-1.5 min-w-[180px]">
                  <Link
                    href={`${base}/coatings`}
                    className="block px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMenuDropdown(false)}
                  >
                    コーティングメニュー
                  </Link>
                  <Link
                    href={`${base}/options`}
                    className="block px-4 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMenuDropdown(false)}
                  >
                    オプションメニュー
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href={`${base}/price`} className="text-white/60 text-[13px] hover:text-white transition-colors">見積もり</Link>
          <Link href={`${base}/guide`} className="text-white/60 text-[13px] hover:text-white transition-colors">ガイド</Link>
          <Link href={`${base}/cases`} className="text-white/60 text-[13px] hover:text-white transition-colors">施工事例</Link>
          <Link href={`${base}/reviews`} className="text-white/60 text-[13px] hover:text-white transition-colors">お客様の声</Link>
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
            onClick={() => trackEvent(storeId, 'phone_call')}
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
          <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">メニュー</div>
          <Link href={`${base}/coatings`} className="text-white/80 text-sm pl-3" onClick={() => setMenuOpen(false)}>コーティングメニュー</Link>
          <Link href={`${base}/options`} className="text-white/80 text-sm pl-3" onClick={() => setMenuOpen(false)}>オプションメニュー</Link>
          <Link href={`${base}/price`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>見積もりシミュレーター</Link>
          <Link href={`${base}/guide`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>コーティングガイド</Link>
          <Link href={`${base}/cases`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>施工事例</Link>
          <Link href={`${base}/reviews`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>お客様の声・Q&A</Link>
          <Link href={`${base}/access`} className="text-white/80 text-sm" onClick={() => setMenuOpen(false)}>店舗情報</Link>
          <Link href={`${base}/booking`} className="text-white/80 text-sm font-bold text-amber-400" onClick={() => setMenuOpen(false)}>ご予約</Link>
        </nav>
      )}
    </header>
  );
}
