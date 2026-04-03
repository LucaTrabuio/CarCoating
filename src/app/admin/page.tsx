'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tab = 'bookings' | 'stores' | 'cases' | 'campaigns';

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '受付済み', color: 'bg-yellow-100 text-yellow-800' },
  2: { label: '確定', color: 'bg-green-100 text-green-800' },
  3: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
  4: { label: '施工完了', color: 'bg-blue-100 text-blue-800' },
};

const SAMPLE_BOOKINGS = [
  { id: '#1024', status: 1, name: '山田 太郎', car: 'ハリアー (L)', plan: 'ダイヤモンド', price: '¥67,600', c1: '4/10 9:00', c2: '4/12 10:00', c3: '4/16 13:00' },
  { id: '#1023', status: 1, name: '佐藤 花子', car: 'N-BOX (SS)', plan: 'クリスタル', price: '¥14,560', c1: '4/11 14:00', c2: '4/14 9:00', c3: '—' },
  { id: '#1022', status: 2, name: '鈴木 一郎', car: 'アルファード (LL)', plan: 'EXキーパー', price: '¥163,400', c1: '4/8 9:00 ✓', c2: '', c3: '' },
  { id: '#1021', status: 4, name: '田中 次郎', car: 'プリウス (M)', plan: 'ダイヤⅡ', price: '¥74,400', c1: '4/5 完了', c2: '', c3: '' },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('bookings');
  const [csvPreview, setCsvPreview] = useState<string[][] | null>(null);

  // Campaign settings (controlled state for live preview)
  const [campaignTitle, setCampaignTitle] = useState('春の新生活キャンペーン');
  const [bannerColor, setBannerColor] = useState('#c49a2a');
  const [campaignStart, setCampaignStart] = useState('2026-04-01');
  const [campaignEnd, setCampaignEnd] = useState('2026-04-30');
  const [campaignDiscount, setCampaignDiscount] = useState('20%');

  function handleCSVTemplateDownload() {
    const headers = [
      'store_id', 'store_name', 'address', 'postal_code', 'prefecture', 'city',
      'tel', 'business_hours', 'regular_holiday', 'access_map_url', 'lat', 'lng',
      'has_booth', 'level1_staff_count', 'level2_staff_count',
      'seo_keywords', 'meta_description',
      'campaign_title', 'campaign_deadline', 'discount_rate', 'campaign_color_code', 'min_price_limit',
      'google_place_id', 'line_url', 'parking_spaces', 'landmark', 'nearby_stations'
    ];
    const example = [
      'tokyo-shinjuku', 'KeePer PRO SHOP 新宿高島屋店', '東京都新宿区千駄ヶ谷5-24-2', '151-0051', '東京都', '新宿区',
      '03-1234-5678', '9:00〜18:00', '年中無休', '', '35.6896', '139.7006',
      'TRUE', '2', '1',
      'コーティング 新宿', 'KeePer PRO SHOP 新宿店',
      '春の新生活キャンペーン', '2026-04-30', '20', '#c49a2a', '14560',
      'ChIJ...', 'https://line.me/...', '3', '高島屋タイムズスクエア隣', '"[{\\"name\\":\\"新宿駅\\",\\"time\\":\\"徒歩5分\\"}]"'
    ];
    const csv = headers.join(',') + '\n' + example.join(',');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const rows = lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setCsvPreview(rows.slice(0, 5)); // Show first 5 rows
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin header */}
      <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="font-bold text-sm">KeePer PRO SHOP 管理パネル</div>
        <Link href="/" className="text-gray-400 text-xs hover:text-white">← サイトに戻る</Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 bg-white">
        {[
          { key: 'bookings' as Tab, label: '予約管理' },
          { key: 'stores' as Tab, label: '店舗マスター' },
          { key: 'cases' as Tab, label: '施工事例投稿' },
          { key: 'campaigns' as Tab, label: 'キャンペーン設定' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${
              tab === t.key ? 'text-[#0f1c2e] border-amber-500' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto p-5">

        {/* BOOKINGS TAB */}
        {tab === 'bookings' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">予約リクエスト一覧</h2>
              <div className="flex gap-2 text-xs">
                {Object.entries(STATUS_LABELS).map(([code, { label, color }]) => (
                  <span key={code} className={`px-2 py-0.5 rounded-full font-bold ${color}`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold">ID</th>
                    <th className="px-3 py-2 text-left font-semibold">ステータス</th>
                    <th className="px-3 py-2 text-left font-semibold">お客様</th>
                    <th className="px-3 py-2 text-left font-semibold">車種</th>
                    <th className="px-3 py-2 text-left font-semibold">プラン</th>
                    <th className="px-3 py-2 text-left font-semibold">見積額</th>
                    <th className="px-3 py-2 text-left font-semibold">第1希望</th>
                    <th className="px-3 py-2 text-left font-semibold">第2希望</th>
                    <th className="px-3 py-2 text-left font-semibold">第3希望</th>
                    <th className="px-3 py-2 text-left font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_BOOKINGS.map(b => (
                    <tr key={b.id} className="border-b border-gray-100">
                      <td className="px-3 py-2.5">{b.id}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${STATUS_LABELS[b.status].color}`}>
                          {STATUS_LABELS[b.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold">{b.name}</td>
                      <td className="px-3 py-2.5">{b.car}</td>
                      <td className="px-3 py-2.5">{b.plan}</td>
                      <td className="px-3 py-2.5">{b.price}</td>
                      <td className="px-3 py-2.5">
                        {b.status === 1 && b.c1 ? <>{b.c1} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c1}
                      </td>
                      <td className="px-3 py-2.5">
                        {b.status === 1 && b.c2 ? <>{b.c2} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c2}
                      </td>
                      <td className="px-3 py-2.5">
                        {b.status === 1 && b.c3 && b.c3 !== '—' ? <>{b.c3} <button className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold">〇</button></> : b.c3}
                      </td>
                      <td className="px-3 py-2.5">
                        {b.status === 1 && <button className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold">代替提案</button>}
                        {b.status === 2 && <button className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">施工完了</button>}
                        {b.status === 4 && <span className="text-gray-400">インセンティブ対象</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STORES TAB */}
        {tab === 'stores' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">店舗マスターCSV管理</h2>
              <div className="flex gap-2">
                <button onClick={handleCSVTemplateDownload} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50">📋 テンプレート</button>
                <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50">📤 CSVエクスポート</button>
                <label className="px-3 py-1.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90">
                  📥 CSVインポート
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>
            </div>

            {csvPreview ? (
              <div className="overflow-x-auto">
                <p className="text-xs text-green-600 font-semibold mb-2">✓ CSVファイルを読み込みました（プレビュー: 最初の{csvPreview.length}行）</p>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {csvPreview[0]?.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-semibold border-b border-gray-200 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-100">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1.5 whitespace-nowrap max-w-[150px] truncate">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex gap-2">
                  <button className="px-4 py-2 bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-lg text-sm font-bold">保存して反映する</button>
                  <button onClick={() => setCsvPreview(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">キャンセル</button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm mb-2">CSVファイルをアップロードして店舗データを一括更新</p>
                <p className="text-gray-300 text-xs">対応カラム: store_id, store_name, address, tel, business_hours, has_booth, level1_staff_count, campaign_title, discount_rate, ...</p>
              </div>
            )}
          </div>
        )}

        {/* CASE STUDY UPLOAD */}
        {tab === 'cases' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-[700px]">
            <h2 className="font-bold text-lg mb-4">施工事例を投稿</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">車種名</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="トヨタ ハリアー" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">施工プラン</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>ダイヤモンドキーパー</option>
                  <option>クリスタルキーパー</option>
                  <option>EXキーパー</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">BEFORE写真</label>
                <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:border-amber-500">
                  📷 ドラッグ&ドロップ
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">AFTER写真</label>
                <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:border-amber-500">
                  📷 ドラッグ&ドロップ
                </div>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">スタッフコメント</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="施工のポイントやお客様の反応など" />
            </div>
            <button className="px-6 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-lg text-sm font-bold">投稿する</button>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {tab === 'campaigns' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-[700px]">
            <h2 className="font-bold text-lg mb-4">キャンペーン設定（HQデフォルト）</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">キャンペーンタイトル</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">バナーカラーコード</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" value={bannerColor} onChange={e => setBannerColor(e.target.value)} />
                  <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1">適用期間</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={campaignStart} onChange={e => setCampaignStart(e.target.value)} />
                <span className="text-xs text-gray-400">〜</span>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1" value={campaignEnd} onChange={e => setCampaignEnd(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">デフォルト割引率</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={campaignDiscount} onChange={e => setCampaignDiscount(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">店舗個別設定がある場合はそちらが優先</p>
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-4 mb-4">
              <p className="text-xs text-gray-400 mb-2">プレビュー（リアルタイム）:</p>
              <div className="text-white text-center py-3 px-5 font-bold text-sm rounded-lg" style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor}88 40%, ${bannerColor} 60%, ${bannerColor}cc)` }}>
                {campaignTitle || 'キャンペーンタイトル'} ｜ 最大{campaignDiscount || '0%'}OFF
                <div className="text-[11px] font-normal opacity-80 mt-0.5">Web予約限定 ｜ {campaignEnd ? new Date(campaignEnd + 'T00:00:00').toLocaleDateString('ja-JP') : '—'}まで</div>
              </div>
            </div>

            <button className="px-6 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-lg text-sm font-bold">保存して全店舗に反映</button>
            <p className="text-xs text-gray-400 mt-2">※ 店舗個別のcampaign_titleが設定されている店舗にはHQデフォルトは適用されません</p>
          </div>
        )}
      </div>
    </div>
  );
}
