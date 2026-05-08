'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import { DEFAULTABLE_KEYS, type DefaultableKey, type GlobalDefaults } from '@/lib/global-defaults-shared';
import LayoutBlocksEditor from '@/components/admin/section-editors/LayoutBlocksEditor';
import BannersEditor from '@/components/admin/section-editors/BannersEditor';
import PromoBannersEditor from '@/components/admin/section-editors/PromoBannersEditor';

const SECTION_LABELS: Record<DefaultableKey, { label: string; description: string }> = {
  page_layout: { label: 'ページレイアウト', description: 'ブロックの順番・表示/非表示・各ブロックの設定（USP、FAQ、クイズ、Process、Benefits等の共通コンテンツ含む）' },
  banners: { label: 'プロモーションバナー', description: 'キャンペーン用のプロモーションバナー一覧' },
  promo_banners: { label: 'ホームページバナー画像', description: 'トップページの大きなバナー画像（4枚）' },
  staff_members: { label: 'スタッフ', description: 'スタッフブロックに表示されるメンバー一覧（CSV 駆動）' },
  custom_services: { label: 'オプションメニュー', description: 'オプション施工サービスの一覧と価格' },
  guide_config: { label: 'ガイド設定', description: 'ガイドページの料金非表示トグル、ティア別の表記オーバーライド' },
  appeal_points: { label: 'アピールポイント', description: '選択済みアピールポイント ID の一覧' },
  certifications: { label: '認定・資格', description: '表示する認定・資格の一覧' },
  store_news: { label: 'お知らせ', description: 'お知らせの一覧（各ストアで通常は個別管理）' },
  blur_config: { label: 'ブラー設定', description: '価格ブラー（要問合せ）の設定' },
  price_overrides: { label: '価格オーバーライド', description: 'ティア × サイズの価格オーバーライドマップ' },
};

interface OverridingStore {
  store_id: string;
  store_name: string;
  updated_at?: string;
}

export default function GlobalDefaultsPage() {
  const user = useAdminAuth();
  const [defaults, setDefaults] = useState<GlobalDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<DefaultableKey>('page_layout');
  const [editedValue, setEditedValue] = useState<string>('');
  const [editedValid, setEditedValid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [overridingStores, setOverridingStores] = useState<OverridingStore[]>([]);

  const loadDefaults = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/defaults', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GlobalDefaults;
      setDefaults(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  // When activeKey or defaults change, reset the editor state.
  useEffect(() => {
    const raw = defaults?.values?.[activeKey] ?? '';
    setEditedValue(raw);
    setEditedValid(true);
  }, [activeKey, defaults]);

  // Load overriding-stores list for the active section.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/defaults/overriding-stores?key=${encodeURIComponent(activeKey)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { stores: [] })
      .then(data => { if (!cancelled) setOverridingStores(data.stores || []); })
      .catch(() => { if (!cancelled) setOverridingStores([]); });
    return () => { cancelled = true; };
  }, [activeKey, defaults]);

  const policy = defaults?.policy?.[activeKey];
  const allowOverride = policy?.allowOverride !== false; // default true when unset

  const isValidJson = useMemo(() => {
    if (!editedValue) return true;
    try { JSON.parse(editedValue); return true; } catch { return false; }
  }, [editedValue]);

  if (user.role !== 'super_admin') {
    return <div className="p-8 text-gray-500">この機能はスーパー管理者のみ使用できます。</div>;
  }

  if (loading) return <div className="p-8 text-gray-400">読み込み中...</div>;

  async function saveValue() {
    if (!isValidJson && editedValue) {
      alert('JSON が不正です。保存できません。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: { [activeKey]: editedValue } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDefaults();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function togglePolicy(allow: boolean) {
    try {
      const res = await fetch('/api/admin/defaults/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeKey, allowOverride: allow }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDefaults();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ポリシー保存に失敗しました');
    }
  }

  async function forceResetStore(storeId: string) {
    if (!confirm(`${storeId} の「${SECTION_LABELS[activeKey].label}」のオーバーライドを強制リセットしますか？`)) return;
    try {
      const res = await fetch(`/api/admin/stores/${encodeURIComponent(storeId)}/overrides/${encodeURIComponent(activeKey)}/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh list
      const listRes = await fetch(`/api/admin/defaults/overriding-stores?key=${encodeURIComponent(activeKey)}`, { cache: 'no-store' });
      if (listRes.ok) {
        const data = await listRes.json();
        setOverridingStores(data.stores || []);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'リセットに失敗しました');
    }
  }

  const current = defaults?.values?.[activeKey] ?? '';
  const dirty = editedValue !== current;

  return (
    <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row gap-6 p-4">
      {/* Sidebar */}
      <aside className="md:w-60 shrink-0">
        <h1 className="text-lg font-bold text-gray-900 mb-1">グローバルデフォルト</h1>
        <p className="text-xs text-gray-500 mb-4">全ストア共通のデフォルト値を管理します。</p>
        <nav className="space-y-1">
          {DEFAULTABLE_KEYS.map(key => {
            const locked = defaults?.policy?.[key]?.allowOverride === false;
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 ${
                  activeKey === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{SECTION_LABELS[key].label}</span>
                {locked && <span title="ロック中" aria-label="ロック中">🔒</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main panel */}
      <main className="flex-1 min-w-0 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{SECTION_LABELS[activeKey].label}</h2>
          <p className="text-xs text-gray-500 mt-1">{SECTION_LABELS[activeKey].description}</p>
        </div>

        {/* Policy toggle */}
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-800">ストアによるオーバーライドを許可</div>
              <div className="text-xs text-gray-500 mt-0.5">
                オフにすると、このセクションはグローバルデフォルトが強制され、既存のストア別の値はストアフロントでは無視されます。
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={e => togglePolicy(e.target.checked)}
                className="sr-only peer"
              />
              <span className={`relative w-11 h-6 rounded-full transition-colors ${allowOverride ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${allowOverride ? 'translate-x-5' : ''}`} />
              </span>
            </label>
          </div>
          {!allowOverride && overridingStores.length > 0 && (
            <div className="mt-3 text-xs text-red-700">
              現在 {overridingStores.length} 店舗がこのセクションをオーバーライドしていますが、ロック中のためストアフロントには反映されません。
            </div>
          )}
        </div>

        {/* Editor (inline component where available, JSON textarea otherwise) */}
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-800">デフォルト値</label>
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs text-green-600 font-semibold">✓ 保存しました</span>}
              {!isValidJson && <span className="text-xs text-red-600">JSON が不正です</span>}
              <button
                type="button"
                onClick={() => { setEditedValue(current); setEditedValid(true); }}
                disabled={!dirty || saving}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                変更を破棄
              </button>
              <button
                type="button"
                onClick={saveValue}
                disabled={!dirty || saving || !isValidJson}
                className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>

          {activeKey === 'page_layout' ? (
            <LayoutBlocksEditor value={editedValue} onChange={setEditedValue} />
          ) : activeKey === 'banners' ? (
            <BannersEditor value={editedValue} onChange={setEditedValue} />
          ) : activeKey === 'promo_banners' ? (
            <PromoBannersEditor value={editedValue} onChange={setEditedValue} />
          ) : (
            <>
              <textarea
                value={editedValue}
                onChange={e => { setEditedValue(e.target.value); setEditedValid(true); }}
                rows={16}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono"
                placeholder={`${activeKey} の JSON 値をここに貼り付け / 編集`}
                spellCheck={false}
              />
              <p className="mt-1 text-[10px] text-gray-400">
                値は既存のストアフィールドと同じ JSON 形式です (例: {activeKey === 'guide_config' ? '{"hide_prices":false,"tier_overrides":{}}' : '[]'})
              </p>
            </>
          )}
        </div>

        {/* Overriding stores */}
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            このセクションをオーバーライド中のストア ({overridingStores.length})
          </h3>
          {overridingStores.length === 0 ? (
            <p className="text-xs text-gray-500">現在、このセクションをオーバーライドしているストアはありません。</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {overridingStores.map(s => (
                <li key={s.store_id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-gray-800">{s.store_name}</div>
                    <div className="text-[10px] text-gray-400">{s.store_id}{s.updated_at ? ` ・ ${s.updated_at}` : ''}</div>
                  </div>
                  <button
                    onClick={() => forceResetStore(s.store_id)}
                    className="text-xs px-2 py-1 rounded border border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    強制リセット
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </main>
    </div>
  );
}
