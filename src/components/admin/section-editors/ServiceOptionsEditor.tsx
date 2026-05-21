'use client';

import { useMemo } from 'react';
import { DEFAULT_SERVICE_OPTIONS, CATEGORY_LABELS } from '@/data/service-options';

/**
 * Friendly add/edit/delete editor for the option (custom_services) catalog.
 *
 * Shared between the per-store builder (/admin/builder/[storeId] → オプション)
 * and the global defaults page (/admin/defaults → オプションメニュー). Driven by
 * a JSON-string `value`/`onChange` pair so it drops in next to the other
 * section editors (BannersEditor, PromoBannersEditor, …).
 *
 * An empty value renders an explicit empty state — we never auto-write the
 * default catalog on mount, so opening the editor doesn't silently create a
 * per-store override. The admin must add an item or click「デフォルトカタログを
 * 読み込む」to populate it.
 */

// Looser than the canonical ServiceOption: category is free-form and a couple
// of fields are optional, matching what stores actually persist.
export interface EditableServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  time?: string;
  popular?: boolean;
  blur_price?: boolean;
}

interface Props {
  value: string;
  onChange: (json: string) => void;
}

function parseOptions(raw: string): EditableServiceOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EditableServiceOption[]) : [];
  } catch {
    return [];
  }
}

export default function ServiceOptionsEditor({ value, onChange }: Props) {
  const options = useMemo(() => parseOptions(value), [value]);

  // Category dropdown choices — the known set plus any custom value already in use.
  const categoryChoices = useMemo(() => {
    const keys = new Set(Object.keys(CATEGORY_LABELS));
    for (const o of options) if (o.category) keys.add(o.category);
    return [...keys];
  }, [options]);

  function commit(next: EditableServiceOption[]) {
    onChange(JSON.stringify(next));
  }

  function add() {
    commit([
      ...options,
      { id: `svc_${Date.now()}`, name: '', description: '', price: 0, category: 'coating' },
    ]);
  }

  function loadDefaultCatalog() {
    commit(DEFAULT_SERVICE_OPTIONS as EditableServiceOption[]);
  }

  function update(id: string, field: keyof EditableServiceOption, fieldValue: string | number | boolean) {
    commit(options.map(o => (o.id === id ? { ...o, [field]: fieldValue } : o)));
  }

  function remove(id: string) {
    commit(options.filter(o => o.id !== id));
  }

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
        <p className="text-sm text-gray-500 mb-1">オプションがまだありません。</p>
        <p className="text-xs text-gray-400 mb-4">
          標準の {DEFAULT_SERVICE_OPTIONS.length} 件のカタログを読み込むか、空から作成できます。
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={loadDefaultCatalog}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            デフォルトカタログを読み込む（{DEFAULT_SERVICE_OPTIONS.length}件）
          </button>
          <button
            type="button"
            onClick={add}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-white transition-colors"
          >
            + 空のオプションを追加
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{options.length} 件のオプション</span>
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 追加
        </button>
      </div>

      {options.map((opt, idx) => (
        <div key={opt.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
            <button
              type="button"
              onClick={() => remove(opt.id)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              削除
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">サービス名</label>
              <input
                type="text"
                value={opt.name}
                onChange={e => update(opt.id, 'name', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
              <select
                value={opt.category}
                onChange={e => update(opt.id, 'category', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {categoryChoices.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">価格（円）</label>
              <input
                type="number"
                value={opt.price}
                onChange={e => update(opt.id, 'price', Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">時間</label>
              <input
                type="text"
                value={opt.time || ''}
                onChange={e => update(opt.id, 'time', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="15分"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
              <textarea
                value={opt.description}
                onChange={e => update(opt.id, 'description', e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!opt.popular}
                  onChange={e => update(opt.id, 'popular', e.target.checked)}
                  className="rounded border-gray-300"
                />
                人気
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!opt.blur_price}
                  onChange={e => update(opt.id, 'blur_price', e.target.checked)}
                  className="rounded border-gray-300"
                />
                価格ブラー
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
