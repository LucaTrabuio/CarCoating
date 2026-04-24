'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BannerPreset } from '@/lib/banner-presets-shared';

export interface BannerPresetPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (preset: BannerPreset) => void;
}

/**
 * Modal that lists banner presets visible to the current user (from GET
 * /api/admin/banner-presets) and emits the selected one via onPick.
 * Shared between the Add Block palette (banner_preset block) and the banners
 * block's "+ プリセットから" button.
 */
export default function BannerPresetPicker({ open, onClose, onPick }: BannerPresetPickerProps) {
  const [presets, setPresets] = useState<BannerPreset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPresets(null);
    setError(null);
    fetch('/api/admin/banner-presets', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => { if (!cancelled) setPresets(data.presets || []); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => {
    if (!presets) return [];
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(p =>
      p.name.toLowerCase().includes(q)
      || (p.structured?.title || '').toLowerCase().includes(q),
    );
  }, [presets, query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">バナープリセットを選択</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="プリセット名やタイトルで検索…"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <div className="flex-1 overflow-auto p-5">
          {error && <div className="text-sm text-red-700">{error}</div>}
          {!presets && !error && <div className="text-sm text-gray-400">読み込み中…</div>}
          {presets && filtered.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-10">
              {query ? '検索結果がありません。' : '利用可能なプリセットがありません。「バナーメーカー」で作成してください。'}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {p.is_template && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold" title="配置時にフィールドを入力">
                        🧩 テンプレート
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded ${p.scope === 'global' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.scope === 'global' ? 'グローバル' : 'ストア'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      p.mode === 'html' ? 'bg-purple-100 text-purple-700'
                      : p.mode === 'combined' ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.mode === 'html' ? 'HTML' : p.mode === 'combined' ? 'Combined' : 'Structured'}
                    </span>
                  </div>
                </div>
                {p.preview_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.preview_image_url}
                    alt=""
                    className="mt-2 w-full h-28 object-cover rounded"
                  />
                ) : p.mode === 'structured' && p.structured.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.structured.image_url}
                    alt=""
                    className="mt-2 w-full h-28 object-cover rounded"
                  />
                ) : null}
                {p.mode === 'structured' && p.structured.title && (
                  <div className="mt-2 text-xs text-gray-600 line-clamp-2">{p.structured.title}</div>
                )}
                {p.mode === 'html' && (
                  <div className="mt-2 text-[10px] font-mono text-gray-400 line-clamp-3">
                    {(p.html_content.html || '').slice(0, 200)}
                  </div>
                )}
                {p.mode === 'combined' && (
                  <div className="mt-2 text-[10px] font-mono text-gray-400 line-clamp-3">
                    {(p.combined_content.source || '').slice(0, 200)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
