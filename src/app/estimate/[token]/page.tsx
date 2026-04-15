import Link from 'next/link';
import { getV3StoreById } from '@/lib/firebase-stores';
import { SITE_URL } from '@/lib/constants';

interface InquiryData {
  id: string;
  store_id: string;
  customer_name: string;
  customer_email: string;
  customer_tel: string;
  services: string[];
  car_size: string;
  estimated_price: number;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  crystal: 'クリスタルキーパー',
  fresh: 'フレッシュキーパー',
  diamond: 'ダイヤモンドキーパー',
  dia2: 'ダイヤⅡキーパー',
  'diamond-premium': 'ダイヤモンドキーパープレミアム',
  'dia2-premium': 'ダイヤⅡキーパープレミアム',
  ex: 'EXキーパー',
  'ex-premium': 'EXキーパープレミアム',
};

const SIZE_LABELS: Record<string, string> = {
  SS: 'SSサイズ（軽自動車）',
  S: 'Sサイズ（小型車）',
  M: 'Mサイズ（中型車）',
  L: 'Lサイズ（大型車・SUV）',
  LL: 'LLサイズ（ミニバン・大型SUV）',
  XL: 'XLサイズ（大型ミニバン・特大車）',
};

async function fetchInquiry(token: string): Promise<InquiryData | null> {
  const baseUrl = SITE_URL;
  try {
    const res = await fetch(`${baseUrl}/api/inquiries/${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inquiry = await fetchInquiry(token);
  const store = inquiry ? await getV3StoreById(inquiry.store_id).catch(() => null) : null;
  const bookingHref = store?.store_slug ? `/${store.store_slug}/booking` : '/';

  if (!inquiry) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-[#0C3290] mb-4"
            style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
          >
            お見積もりが見つかりません
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            URLが正しいかご確認ください。
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-amber-500 text-[#0C3290] font-bold rounded-lg text-sm hover:bg-amber-500 transition-colors"
          >
            トップページへ
          </Link>
        </div>
      </main>
    );
  }

  const createdDate = new Date(inquiry.created_at).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-5">
      <div className="max-w-[560px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-2">
            YOUR ESTIMATE
          </p>
          <h1
            className="text-xl md:text-2xl font-bold text-[#0C3290]"
            style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
          >
            お見積もり詳細
          </h1>
          <p className="text-xs text-slate-400 mt-1">作成日: {createdDate}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Customer info */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-3">
              お客様情報
            </h2>
            <div className="space-y-2">
              <Row label="お名前" value={inquiry.customer_name} />
              {inquiry.customer_tel && (
                <Row label="電話番号" value={inquiry.customer_tel} />
              )}
            </div>
          </div>

          {/* Vehicle & services */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-3">
              ご希望内容
            </h2>
            <div className="space-y-2">
              <Row
                label="車のサイズ"
                value={SIZE_LABELS[inquiry.car_size] || inquiry.car_size}
              />
              <div className="flex gap-3 py-1.5">
                <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0 pt-0.5">
                  コース
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.services.map((svc) => (
                    <span
                      key={svc}
                      className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md"
                    >
                      {SERVICE_LABELS[svc] || svc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="px-6 py-6 bg-[#0C3290] text-center">
            <p className="text-[#0C3290] text-xs font-bold tracking-widest mb-2">
              概算お見積もり
            </p>
            <p
              className="text-3xl font-bold text-white"
              style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
            >
              {inquiry.estimated_price.toLocaleString()}
              <span className="text-lg ml-1">円</span>
            </p>
            <p className="text-white/40 text-[10px] mt-1">
              ※ 最終価格は車の状態によって変動する場合がございます
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center space-y-3">
          <Link
            href={bookingHref}
            className="inline-block w-full max-w-[320px] px-6 py-3.5 bg-amber-500 text-[#0C3290] font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            予約する
          </Link>
          <p className="text-xs text-slate-400">
            お電話でのご予約も承っております
          </p>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-[#0C3290]">{value}</span>
    </div>
  );
}
