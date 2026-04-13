'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface HomepageBlock {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  order: number;
  config: Record<string, unknown>;
}

const DEFAULT_BLOCKS: HomepageBlock[] = [
  { id: 'hero', type: 'hero_home', label: 'ヒーローセクション', visible: true, order: 0, config: { title: '洗車だけで、この輝きが続く。', subtitle: 'KeePer PRO SHOP', description: '特許技術のガラスコーティングで愛車を守る。全国のKeePer認定プロショップで、あなたの車に最適なコースをご提案します。', cta_primary_text: '近くの店舗を探す', cta_primary_link: '#store-finder', cta_secondary_text: 'メニューを見る', cta_secondary_link: '#services' } },
  { id: 'services', type: 'service_menu', label: 'コーティングメニュー', visible: true, order: 1, config: { show_prices: true } },
  { id: 'why', type: 'why_keeper', label: 'KeePer が選ばれる理由', visible: true, order: 2, config: { items: [{ icon: '🏆', title: '特許技術', desc: 'KeePer独自の特許技術による被膜構造。' }, { icon: '👨‍🔬', title: '認定技術者', desc: '全国統一の技術基準。' }, { icon: '🔬', title: '研究開発力', desc: '科学的データに基づく確かな性能。' }, { icon: '💰', title: 'Web予約割引', desc: 'Web予約限定で最大20%OFF。' }, { icon: '🏢', title: '専用ブース完備', desc: 'コーティング専用の施工ブースで丁寧に仕上げ。' }, { icon: '📋', title: 'アフターサポート', desc: 'メンテナンスプログラムで美しさを長期維持。' }] } },
  { id: 'finder', type: 'store_finder', label: '店舗検索マップ', visible: true, order: 3, config: { heading: '近くの店舗を探す' } },
  { id: 'blog', type: 'blog_section', label: 'ブログ・コラム', visible: true, order: 4, config: { max_articles: 4, heading: 'コーティングコラム' } },
  { id: 'news', type: 'news_home', label: 'ニュース', visible: true, order: 5, config: { max_items: 5, heading: 'ニュース・お知らせ' } },
  { id: 'process', type: 'process_home', label: '施工の流れ', visible: true, order: 6, config: { steps: [{ icon: '📋', title: 'お見積もり・ご相談', desc: 'お車の状態を確認し、最適なコースをご提案。' }, { icon: '📅', title: 'ご予約', desc: 'Webまたはお電話でご予約。' }, { icon: '🔧', title: '施工', desc: '専用ブースで丁寧に施工。' }, { icon: '✨', title: 'お引き渡し', desc: '仕上がりをご確認いただきお引き渡し。' }] } },
  { id: 'cta', type: 'cta_home', label: 'CTA（予約誘導）', visible: true, order: 7, config: { heading: 'まずはお気軽にご相談ください', description: 'お車の状態を見て、最適なコースをご提案します。', button_text: '近くの店舗を探す', button_link: '#store-finder' } },
];

export default function HomepagePage() {
  const user = useAdminAuth();
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then(r => r.json())
      .then(data => {
        if (data.layout?.blocks) {
          setBlocks(data.layout.blocks);
        } else {
          setBlocks(DEFAULT_BLOCKS);
        }
      })
      .catch(() => setBlocks(DEFAULT_BLOCKS))
      .finally(() => setLoading(false));
  }, []);

  if (user.role !== 'super_admin') {
    return <div className="p-8 text-gray-500">この機能はスーパー管理者のみ使用できます。</div>;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('保存に失敗しました'); }
    setSaving(false);
  }

  function toggleVisibility(id: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  }

  function moveBlock(id: string, direction: 'up' | 'down') {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }

  function updateBlockConfig(id: string, key: string, value: unknown) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b));
  }

  if (loading) return <div className="p-8 text-gray-400">読み込み中...</div>;

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">トップページ設定</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600 font-semibold">✓ 保存しました</span>}
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-amber-500 text-[#0C3290] rounded-lg text-sm font-bold cursor-pointer hover:bg-amber-600 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">セクションの表示/非表示、並び替え、テキストの編集ができます。</p>

      <div className="space-y-2">
        {blocks.sort((a, b) => a.order - b.order).map((block, idx) => (
          <div key={block.id} className={`bg-white border rounded-xl p-4 transition-opacity ${!block.visible ? 'opacity-50 border-gray-100' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-600 text-xs cursor-pointer disabled:invisible">▲</button>
                  <button onClick={() => moveBlock(block.id, 'down')} disabled={idx === blocks.length - 1}
                    className="text-gray-300 hover:text-gray-600 text-xs cursor-pointer disabled:invisible">▼</button>
                </div>
                <div>
                  <div className="font-bold text-sm text-[#0C3290]">{block.label}</div>
                  <div className="text-[10px] text-gray-400">{block.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer">
                  {editingBlock === block.id ? '閉じる' : '編集'}
                </button>
                <button onClick={() => toggleVisibility(block.id)}
                  className={`text-xs px-2 py-1 rounded cursor-pointer ${block.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {block.visible ? '表示中' : '非表示'}
                </button>
              </div>
            </div>

            {/* Inline config editor */}
            {editingBlock === block.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {Object.entries(block.config).map(([key, value]) => {
                  if (typeof value === 'string') {
                    return (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{key}</label>
                        {value.length > 80 ? (
                          <textarea value={value} onChange={e => updateBlockConfig(block.id, key, e.target.value)}
                            rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        ) : (
                          <input type="text" value={value} onChange={e => updateBlockConfig(block.id, key, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        )}
                      </div>
                    );
                  }
                  if (typeof value === 'boolean') {
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={value} onChange={e => updateBlockConfig(block.id, key, e.target.checked)} />
                        {key}
                      </label>
                    );
                  }
                  if (typeof value === 'number') {
                    return (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{key}</label>
                        <input type="number" value={value} onChange={e => updateBlockConfig(block.id, key, Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    );
                  }
                  // Arrays/objects shown as JSON
                  if (Array.isArray(value) || typeof value === 'object') {
                    return (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{key} (JSON)</label>
                        <textarea
                          value={JSON.stringify(value, null, 2)}
                          onChange={e => { try { updateBlockConfig(block.id, key, JSON.parse(e.target.value)); } catch { /* invalid json */ } }}
                          rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
