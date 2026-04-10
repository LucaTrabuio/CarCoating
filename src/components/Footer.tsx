import Link from 'next/link';

interface StoreContact {
  name: string;
  tel: string;
}

interface FooterProps {
  storeId: string;
  storeName: string;
  tel: string;
  address: string;
  businessHours: string;
  regularHoliday?: string;
  isMultiStore?: boolean;
  stores?: StoreContact[];
}

export default function Footer({ storeId, storeName, tel, address, businessHours, regularHoliday, isMultiStore, stores }: FooterProps) {
  const base = `/${storeId}`;
  const multiStorePhones = isMultiStore && stores ? stores.filter(s => s.tel) : [];

  return (
    <footer className="bg-gray-900 text-gray-400 py-8">
      <div className="max-w-[1100px] mx-auto px-5">
        {/* Company / Store info */}
        <div className="text-center mb-6">
          <div className="text-white font-bold text-base mb-1">{storeName}</div>
          {!isMultiStore && address && <div className="text-xs">{address}</div>}
          {!isMultiStore && businessHours && <div className="text-xs">営業時間: {businessHours}</div>}
          {!isMultiStore && regularHoliday && <div className="text-xs">定休日: {regularHoliday}</div>}
          {!isMultiStore && tel && <a href={`tel:${tel}`} className="text-amber-500 font-bold text-lg mt-2 inline-block">{tel}</a>}
          {isMultiStore && multiStorePhones.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {multiStorePhones.map(s => (
                <div key={s.name} className="flex items-center justify-center gap-3 text-xs">
                  <span className="text-gray-400">{s.name}</span>
                  <a href={`tel:${s.tel}`} className="text-amber-500 font-bold">{s.tel}</a>
                </div>
              ))}
            </div>
          )}
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

        {/* Navigation */}
        <nav className="flex flex-wrap justify-center gap-4 text-xs mb-6">
          <Link href={base} className="hover:text-white transition-colors">ホーム</Link>
          <Link href={`${base}/coatings`} className="hover:text-white transition-colors">メニュー</Link>
          <Link href={`${base}/price`} className="hover:text-white transition-colors">見積もり・料金</Link>
          <Link href={`${base}/cases`} className="hover:text-white transition-colors">施工事例</Link>
          <Link href={`${base}/reviews`} className="hover:text-white transition-colors">お客様の声</Link>
          <Link href={`${base}/access`} className="hover:text-white transition-colors">
            {isMultiStore ? '店舗一覧・アクセス' : '店舗情報'}
          </Link>
          <Link href={`${base}/booking`} className="hover:text-white transition-colors">ご予約</Link>
          <Link href={`${base}/privacy`} className="hover:text-white transition-colors">プライバシー</Link>
        </nav>
        <p className="text-center text-[10px] opacity-40">&copy; {new Date().getFullYear()} {storeName} KeePer PRO SHOP. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
