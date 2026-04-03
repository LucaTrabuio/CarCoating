import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8">
      <div className="max-w-[1100px] mx-auto px-5">
        <div className="text-center mb-6">
          <div className="text-white font-bold text-base mb-1">KeePer PRO SHOP カーコーティング専門店</div>
          <div className="text-xs">Web予約限定割引あり ｜ 完全予約制</div>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] mb-5 pb-5 border-b border-gray-800">
          <div>
            <span className="text-gray-500">お支払い:</span>{' '}
            <span className="text-gray-300">現金 / クレジットカード / 電子マネー</span>
          </div>
          <div>
            <span className="text-gray-500">ポイント:</span>{' '}
            <span className="text-gray-300">Ponta / 楽天 / dポイント（¥200=1pt）</span>
          </div>
        </div>

        <nav className="flex flex-wrap justify-center gap-4 text-xs mb-6">
          <Link href="/" className="hover:text-white transition-colors">ホーム</Link>
          <Link href="/coatings" className="hover:text-white transition-colors">コーティングメニュー</Link>
          <Link href="/price" className="hover:text-white transition-colors">料金・見積もり</Link>
          <Link href="/cases" className="hover:text-white transition-colors">施工事例</Link>
          <Link href="/blog" className="hover:text-white transition-colors">ブログ</Link>
          <Link href="/booking" className="hover:text-white transition-colors">ご予約・お問い合わせ</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">プライバシー</Link>
        </nav>
        <p className="text-center text-[10px] opacity-40">&copy; {new Date().getFullYear()} KeePer PRO SHOP. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
