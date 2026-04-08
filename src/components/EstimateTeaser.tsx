'use client';

import { useState, useCallback, type FormEvent } from 'react';
import QRCode from 'qrcode';

type CarSize = 'SS' | 'S' | 'M' | 'L' | 'LL' | 'XL';

const SIZE_OPTIONS: { value: CarSize; label: string }[] = [
  { value: 'SS', label: 'SSサイズ（軽自動車）' },
  { value: 'S', label: 'Sサイズ（小型車）' },
  { value: 'M', label: 'Mサイズ（中型車）' },
  { value: 'L', label: 'Lサイズ（大型車・SUV）' },
  { value: 'LL', label: 'LLサイズ（ミニバン・大型SUV）' },
  { value: 'XL', label: 'XLサイズ（大型ミニバン・特大車）' },
];

const SERVICE_OPTIONS = [
  { id: 'crystal', label: 'クリスタルキーパー', basePrice: 22800 },
  { id: 'fresh', label: 'フレッシュキーパー', basePrice: 33300 },
  { id: 'diamond', label: 'ダイヤモンドキーパー', basePrice: 63400 },
  { id: 'dia2', label: 'ダイヤⅡキーパー', basePrice: 74400 },
  { id: 'ex', label: 'EXキーパー', basePrice: 137500 },
];

interface EstimateTeaserProps {
  storeId: string;
  basePath: string;
}

export default function EstimateTeaser({ storeId, basePath }: EstimateTeaserProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [carSize, setCarSize] = useState<CarSize>('M');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rough estimate price based on selections
  const estimatedPrice = selectedServices.reduce((sum, sid) => {
    const svc = SERVICE_OPTIONS.find((s) => s.id === sid);
    return sum + (svc?.basePrice ?? 0);
  }, 0);

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!name || !email || selectedServices.length === 0) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            customer_name: name,
            customer_email: email,
            customer_tel: tel,
            services: selectedServices,
            car_size: carSize,
            estimated_price: estimatedPrice,
          }),
        });

        if (!res.ok) throw new Error('送信に失敗しました');

        const { qr_token } = await res.json();
        const qrUrl = `${window.location.origin}/estimate/${qr_token}`;
        const dataUrl = await QRCode.toDataURL(qrUrl, { width: 200, margin: 2 });
        setQrDataUrl(dataUrl);
      } catch {
        setError('送信に失敗しました。もう一度お試しください。');
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, tel, carSize, selectedServices, storeId, estimatedPrice],
  );

  // ─── QR code success view ───
  if (qrDataUrl) {
    return (
      <section className="py-14 px-5 bg-white">
        <div className="max-w-[480px] mx-auto text-center">
          <p className="text-amber-500 text-xs font-bold tracking-widest mb-2">
            ESTIMATE READY
          </p>
          <h2
            className="text-xl md:text-2xl font-bold text-[#0f1c2e] mb-6"
            style={{ fontFamily: '"Noto Serif JP", serif' }}
          >
            お見積もりQRコード
          </h2>

          <div className="inline-block bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <img src={qrDataUrl} alt="お見積もりQRコード" width={200} height={200} />
          </div>

          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            このQRコードを保存して、
            <br />
            いつでもお見積もりをご確認いただけます
          </p>

          <div className="mt-6">
            <a
              href={basePath ? `${basePath}/booking` : '/booking'}
              className="inline-block px-6 py-3 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              予約に進む
            </a>
          </div>
        </div>
      </section>
    );
  }

  // ─── Form view ───
  return (
    <section className="py-14 px-5 bg-slate-50">
      <div className="max-w-[560px] mx-auto">
        <div className="text-center mb-8">
          <p className="text-amber-500 text-xs font-bold tracking-widest mb-2">
            QUICK ESTIMATE
          </p>
          <h2
            className="text-xl md:text-2xl font-bold text-[#0f1c2e]"
            style={{ fontFamily: '"Noto Serif JP", serif' }}
          >
            かんたんお見積もり
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            ご希望を入力して概算をチェック
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="est-name" className="block text-xs font-bold text-slate-500 mb-1">
              お名前 <span className="text-red-400">*</span>
            </label>
            <input
              id="est-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="山田 太郎"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="est-email" className="block text-xs font-bold text-slate-500 mb-1">
              メールアドレス <span className="text-red-400">*</span>
            </label>
            <input
              id="est-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="example@email.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="est-tel" className="block text-xs font-bold text-slate-500 mb-1">
              電話番号
            </label>
            <input
              id="est-tel"
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="090-1234-5678"
            />
          </div>

          {/* Car size */}
          <div>
            <label htmlFor="est-size" className="block text-xs font-bold text-slate-500 mb-1">
              車のサイズ
            </label>
            <select
              id="est-size"
              value={carSize}
              onChange={(e) => setCarSize(e.target.value as CarSize)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">
              ご希望のコース <span className="text-red-400">*</span>
            </p>
            <div className="space-y-2">
              {SERVICE_OPTIONS.map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedServices.includes(svc.id)
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                    className="accent-amber-500"
                  />
                  <span className="flex-1 font-semibold text-[#0f1c2e]">
                    {svc.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {svc.basePrice.toLocaleString()}円〜
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Blurred estimate */}
          {selectedServices.length > 0 && (
            <div className="relative bg-[#0f1c2e] rounded-xl p-6 text-center overflow-hidden">
              <p className="text-amber-400 text-xs font-bold tracking-widest mb-2">
                概算お見積もり
              </p>
              <p
                className="text-3xl font-bold text-white blur-md select-none"
                aria-hidden="true"
              >
                {estimatedPrice.toLocaleString()}円
              </p>
              <p className="text-white/50 text-xs mt-2">
                送信後にお見積もりを確認できます
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !name || !email || selectedServices.length === 0}
            className="w-full py-3.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? '送信中...' : 'お見積もりを送信する'}
          </button>
        </form>
      </div>
    </section>
  );
}
