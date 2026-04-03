import Link from 'next/link';

interface FooterProps {
  storeId: string;
  storeName: string;
  tel: string;
  address: string;
  businessHours: string;
}

export default function Footer({ storeId, storeName, tel, address, businessHours }: FooterProps) {
  const base = `/${storeId}`;

  return (
    <footer className="bg-gray-900 text-gray-400 py-8">
      <div className="max-w-[1100px] mx-auto px-5">
        <div className="text-center mb-6">
          <div className="text-white font-bold text-base mb-1">{storeName}</div>
          <div className="text-xs">{address}</div>
          <div className="text-xs">{businessHours}</div>
          <a href={`tel:${tel}`} className="text-amber-500 font-bold text-lg mt-2 inline-block">{tel}</a>
        </div>

        {/* Payment & Points */}
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
          <Link href={base} className="hover:text-white transition-colors">ホーム</Link>
          <Link href={`${base}/coatings`} className="hover:text-white transition-colors">メニュー</Link>
          <Link href={`${base}/price`} className="hover:text-white transition-colors">見積もり・料金</Link>
          <Link href={`${base}/guide`} className="hover:text-white transition-colors">コーティングガイド</Link>
          <Link href={`${base}/cases`} className="hover:text-white transition-colors">施工事例</Link>
          <Link href={`${base}/reviews`} className="hover:text-white transition-colors">お客様の声・Q&A</Link>
          <Link href={`${base}/access`} className="hover:text-white transition-colors">店舗情報</Link>
          <Link href={`${base}/booking`} className="hover:text-white transition-colors">ご予約</Link>
          <Link href={`${base}/privacy`} className="hover:text-white transition-colors">プライバシー</Link>
        </nav>
        <p className="text-center text-[10px] opacity-40">&copy; {new Date().getFullYear()} {storeName} KeePer PRO SHOP. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
