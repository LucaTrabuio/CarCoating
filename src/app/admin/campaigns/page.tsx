'use client';

import { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [campaignTitle, setCampaignTitle] = useState('春の新生活キャンペーン');
  const [bannerColor, setBannerColor] = useState('#c49a2a');
  const [campaignStart, setCampaignStart] = useState('2026-04-01');
  const [campaignEnd, setCampaignEnd] = useState('2026-04-30');
  const [campaignDiscount, setCampaignDiscount] = useState('20');
  const [campaignSaved, setCampaignSaved] = useState(false);
  const [campaignLoaded, setCampaignLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/campaign')
      .then(r => r.json())
      .then(data => {
        if (data.title) setCampaignTitle(data.title);
        if (data.color) setBannerColor(data.color);
        if (data.start) setCampaignStart(data.start);
        if (data.end) setCampaignEnd(data.end);
        if (data.discount !== undefined) setCampaignDiscount(String(data.discount));
        setCampaignLoaded(true);
      })
      .catch(() => setCampaignLoaded(true));
  }, []);

  async function handleCampaignSave() {
    const data = { title: campaignTitle, color: bannerColor, start: campaignStart, end: campaignEnd, discount: parseInt(campaignDiscount) || 20 };
    try {
      const res = await fetch('/api/campaign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // fallback to localStorage
    }
    localStorage.setItem('admin_campaign', JSON.stringify(data));
    setCampaignSaved(true);
    setTimeout(() => setCampaignSaved(false), 3000);
  }

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-lg mb-4">キャンペーン設定（HQデフォルト）</h2>
        {!campaignLoaded && <p className="text-xs text-gray-400 mb-3">読み込み中...</p>}
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

        <button onClick={handleCampaignSave} className="px-6 py-2.5 bg-gradient-to-br from-amber-600 to-amber-500 text-white rounded-lg text-sm font-bold">保存して全店舗に反映</button>
        {campaignSaved && (
          <p className="text-xs text-green-600 font-semibold mt-2">✓ キャンペーン設定を保存しました</p>
        )}
        <p className="text-xs text-gray-400 mt-2">※ 店舗個別のcampaign_titleが設定されている店舗にはHQデフォルトは適用されません</p>
      </div>
    </div>
  );
}
