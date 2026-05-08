'use client';

import { useState } from 'react';
import type { Banner } from '@/lib/block-types';

export interface SaveAsPresetModalProps {
  open: boolean;
  onClose: () => void;
  /** Banner whose fields will seed the new preset. */
  banner: Banner | null;
  /** Store owning a scope='store' preset, if any. Omit to only allow scope='global'. */
  storeId?: string;
  /** Is the current user super_admin? Determines whether scope='global' is available. */
  isSuperAdmin: boolean;
  onSaved?: (presetId: string) => void;
}

/**
 * Modal that takes an existing banner + a user-chosen name/scope and POSTs a
 * new banner preset. Used by the "💾 プリセットとして保存" button in BannersEditor.
 */
export default function SaveAsPresetModal({
  open,
  onClose,
  banner,
  storeId,
  isSuperAdmin,
  onSaved,
}: SaveAsPresetModalProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'global' | 'store'>(isSuperAdmin ? 'global' : 'store');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !banner) return null;

  const hasStoreContext = Boolean(storeId);
  const canGlobal = isSuperAdmin;
  const canStore = hasStoreContext;

  async function submit() {
    if (!banner) return;
    if (!name.trim()) {
      setError('プリセット名を入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mode = banner.mode === 'html' ? 'html' : 'structured';
      const body = {
        name: name.trim(),
        scope,
        owner_store_id: scope === 'store' ? (storeId || '') : '',
        mode,
        structured: mode === 'structured' ? {
          title: banner.title,
          subtitle: banner.subtitle,
          image_url: banner.image_url,
          original_price: banner.original_price,
          discount_rate: banner.discount_rate,
          link_url: banner.link_url,
          custom_css: banner.custom_css,
        } : undefined,
        html_content: mode === 'html' ? {
          html: banner.html || '',
          css: banner.html_css || '',
        } : undefined,
      };
      const res = await fetch('/api/admin/banner-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (onSaved && data.id) onSaved(data.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">プリセットとして保存</h2>
          <p className="text-xs text-gray-500 mt-0.5">このバナーをプリセットとして保存し、後で再利用できます。</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">プリセット名</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 春のキャンペーン"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </label>
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1">スコープ</div>
            <div className="flex gap-2">
              {canGlobal && (
                <label className={`flex-1 border rounded-lg p-2 cursor-pointer text-sm ${scope === 'global' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="global"
                    checked={scope === 'global'}
                    onChange={() => setScope('global')}
                    className="mr-2"
                  />
                  <span className="font-semibold">グローバル</span>
                  <div className="text-[10px] text-gray-500 mt-0.5">全ストアが使用可能</div>
                </label>
              )}
              {canStore && (
                <label className={`flex-1 border rounded-lg p-2 cursor-pointer text-sm ${scope === 'store' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="scope"
                    value="store"
                    checked={scope === 'store'}
                    onChange={() => setScope('store')}
                    className="mr-2"
                  />
                  <span className="font-semibold">このストア用</span>
                  <div className="text-[10px] text-gray-500 mt-0.5">{storeId}</div>
                </label>
              )}
            </div>
          </div>
          {error && <div className="text-xs text-red-700">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !name.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
