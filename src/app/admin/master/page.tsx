'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { coatingTiers as defaultTiers } from '@/data/coating-tiers';
import type { CoatingTier } from '@/lib/types';

interface AppealPoint {
  id: string;
  icon: string;
  label: string;
  description: string;
}

function newAppealPoint(): AppealPoint {
  return { id: crypto.randomUUID(), icon: '', label: '', description: '' };
}

const SIZES = ['SS', 'S', 'M', 'L', 'LL', 'XL'] as const;

export default function MasterPage() {
  const admin = useAdminAuth();
  const [appealPoints, setAppealPoints] = useState<AppealPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Coating tiers state
  const [tiers, setTiers] = useState<CoatingTier[]>([...defaultTiers]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tiersSaving, setTiersSaving] = useState(false);
  const [tiersSaved, setTiersSaved] = useState(false);

  const fetchAppealPoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/appeal-points');
      const data = await res.json();
      setAppealPoints(data.items ?? data ?? []);
    } catch {
      setAppealPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTiers = useCallback(async () => {
    setTiersLoading(true);
    try {
      const res = await fetch('/api/admin/master/coating-tiers');
      const data = await res.json();
      if (data.tiers && Array.isArray(data.tiers) && data.tiers.length > 0) {
        setTiers(data.tiers);
      }
    } catch { /* use defaults */ }
    setTiersLoading(false);
  }, []);

  useEffect(() => {
    if (admin.role === 'super_admin') {
      fetchAppealPoints();
      fetchTiers();
    }
  }, [admin.role, fetchAppealPoints, fetchTiers]);

  if (admin.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  function updatePoint(id: string, field: keyof AppealPoint, value: string) {
    setAppealPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function addPoint() {
    setAppealPoints((prev) => [...prev, newAppealPoint()]);
  }

  function removePoint(id: string) {
    setAppealPoints((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/master/appeal-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: appealPoints }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      alert('保存しました');
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">マスターデータ管理</h1>

      {/* Appeal Points */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">アピールポイント</h2>
          <button
            onClick={addPoint}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 追加
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : appealPoints.length === 0 ? (
          <p className="text-sm text-gray-500">
            アピールポイントがありません。「追加」をクリックして作成してください。
          </p>
        ) : (
          <div className="space-y-3">
            {appealPoints.map((point, idx) => (
              <div
                key={point.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">
                  {idx + 1}
                </span>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">アイコン</label>
                    <input
                      type="text"
                      value={point.icon}
                      onChange={(e) => updatePoint(point.id, 'icon', e.target.value)}
                      placeholder="例: shield, star"
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">ラベル</label>
                    <input
                      type="text"
                      value={point.label}
                      onChange={(e) => updatePoint(point.id, 'label', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">説明</label>
                    <input
                      type="text"
                      value={point.description}
                      onChange={(e) => updatePoint(point.id, 'description', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePoint(point.id)}
                  className="mt-5 shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Coating Tiers */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">コーティングコース</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">全国統一のコース名・説明・料金を管理。店舗別の価格上書きはページビルダーで設定。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTiers([...defaultTiers]); }}
              className="text-[10px] text-red-500 hover:text-red-700 underline cursor-pointer"
            >
              デフォルトに戻す
            </button>
            <button
              onClick={async () => {
                setTiersSaving(true);
                try {
                  const res = await fetch('/api/admin/master/coating-tiers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tiers }),
                  });
                  if (!res.ok) throw new Error();
                  setTiersSaved(true);
                  setTimeout(() => setTiersSaved(false), 3000);
                } catch { alert('保存に失敗しました'); }
                setTiersSaving(false);
              }}
              disabled={tiersSaving}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
            >
              {tiersSaving ? '保存中...' : '保存'}
            </button>
            {tiersSaved && <span className="text-xs text-green-600 font-semibold">✓</span>}
          </div>
        </div>

        {tiersLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <div className="space-y-3">
            {tiers.map((tier, idx) => (
              <details key={tier.id} className="border border-gray-200 rounded-lg">
                <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono w-6">{idx + 1}</span>
                    <span className="text-sm font-bold text-[#0f1c2e]">{tier.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{tier.id}</span>
                  </div>
                  <span className="text-xs text-gray-400">SS ¥{tier.prices.SS.toLocaleString()} 〜 XL ¥{tier.prices.XL.toLocaleString()}</span>
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">コース名</label>
                      <input type="text" value={tier.name}
                        onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, name: e.target.value } : t))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">キャッチコピー</label>
                      <input type="text" value={tier.tagline}
                        onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, tagline: e.target.value } : t))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">説明</label>
                    <textarea value={tier.description} rows={2}
                      onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, description: e.target.value } : t))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">特徴</label>
                    <textarea value={tier.key_differentiator} rows={2}
                      onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, key_differentiator: e.target.value } : t))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">施工料金（税込）</label>
                    <div className="grid grid-cols-6 gap-2">
                      {SIZES.map(size => (
                        <div key={size}>
                          <div className="text-[9px] text-gray-400 text-center font-bold">{size}</div>
                          <input
                            type="number"
                            min={0}
                            value={tier.prices[size]}
                            onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? {
                              ...t,
                              prices: { ...t.prices, [size]: parseInt(e.target.value) || 0 },
                            } : t))}
                            className="w-full px-1 py-1 border border-gray-200 rounded text-[11px] text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">耐久年数</label>
                      <input type="text" value={tier.durability_years}
                        onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, durability_years: e.target.value } : t))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">施工時間</label>
                      <input type="text" value={tier.application_time}
                        onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, application_time: e.target.value } : t))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">メンテナンス間隔</label>
                      <input type="text" value={tier.maintenance_interval}
                        onChange={e => setTiers(prev => prev.map((t, i) => i === idx ? { ...t, maintenance_interval: e.target.value } : t))}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
