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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1100px] mx-auto px-5 flex items-center justify-between h-14">
        <Link href={base} className="flex items-center gap-2.5 text-[#0C3290]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/keeper-logo-header.png" alt="KeePer" className="h-10" />
          <span className="text-[13px] font-bold leading-tight">
            {storeName}
          </span>
        </Link>

        <nav className="hidden md:flex gap-5 items-center">
          <Link href={base} className="text-gray-600 text-[13px] hover:text-black transition-colors">ホーム</Link>

          {/* Menu dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setMenuDropdown(true)}
            onMouseLeave={() => setMenuDropdown(false)}
          >
            <button className="text-gray-600 text-[13px] hover:text-black transition-colors cursor-pointer">
              メニュー ▾
            </button>
            {menuDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                <div className="bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 min-w-[180px]">
                  <Link
                    href={`${base}/coatings`}
                    className="block px-4 py-2 text-[13px] text-gray-600 hover:text-black hover:bg-gray-50 transition-colors"
                    onClick={() => setMenuDropdown(false)}
                  >
                    コーティングメニュー
                  </Link>
                  <Link
                    href={`${base}/options`}
                    className="block px-4 py-2 text-[13px] text-gray-600 hover:text-black hover:bg-gray-50 transition-colors"
                    onClick={() => setMenuDropdown(false)}
                  >
                    オプションメニュー
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href={`${base}/price`} className="text-gray-600 text-[13px] hover:text-black transition-colors">見積もり</Link>
          <Link href={`${base}/guide`} className="text-gray-600 text-[13px] hover:text-black transition-colors">ガイド</Link>
          <Link href={`${base}/cases`} className="text-gray-600 text-[13px] hover:text-black transition-colors">施工事例</Link>
          <Link href={`${base}/reviews`} className="text-gray-600 text-[13px] hover:text-black transition-colors">お客様の声</Link>
          <Link href={`${base}/booking`} className="text-gray-600 text-[13px] hover:text-black transition-colors">ご予約</Link>
          <Link href={`${base}/inquiry`} className="text-gray-600 text-[13px] hover:text-black transition-colors">お問い合わせ</Link>
        </nav>

        <div className="flex items-center gap-2">
          {lineUrl && (
            <a href={lineUrl} target="_blank" rel="noopener noreferrer"
              className="text-[#0C3290] text-[11px] font-semibold px-3 py-1.5 rounded-md bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-colors">
              LINE
            </a>
          )}
          {tel && (
            <a href={`tel:${tel}`}
              onClick={() => trackEvent(storeId, 'phone_call')}
              className="text-black text-[11px] font-bold px-3 py-1.5 rounded-md bg-amber-500">
              &#9742; {tel}
            </a>
          )}
          <button
            className="md:hidden text-black text-xl ml-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="メニュー"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-gray-200 px-5 py-4 flex flex-col gap-3">
          <Link href={base} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>ホーム</Link>
          <div className="text-gray-400 text-[10px] uppercase tracking-wider mt-1">メニュー</div>
          <Link href={`${base}/coatings`} className="text-gray-700 text-sm pl-3" onClick={() => setMenuOpen(false)}>コーティングメニュー</Link>
          <Link href={`${base}/options`} className="text-gray-700 text-sm pl-3" onClick={() => setMenuOpen(false)}>オプションメニュー</Link>
          <Link href={`${base}/price`} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>見積もりシミュレーター</Link>
          <Link href={`${base}/guide`} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>コーティングガイド</Link>
          <Link href={`${base}/cases`} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>施工事例</Link>
          <Link href={`${base}/reviews`} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>お客様の声・Q&A</Link>
          <Link href={`${base}/access`} className="text-gray-700 text-sm" onClick={() => setMenuOpen(false)}>店舗情報</Link>
          <Link href={`${base}/booking`} className="text-gray-700 text-sm font-bold text-[#0C3290]" onClick={() => setMenuOpen(false)}>ご予約</Link>
          <Link href={`${base}/inquiry`} className="text-gray-700 text-sm text-blue-600" onClick={() => setMenuOpen(false)}>お問い合わせ</Link>
        </nav>
      )}
    </header>
  );
}
