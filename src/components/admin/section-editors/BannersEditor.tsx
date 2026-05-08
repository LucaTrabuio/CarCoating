'use client';

import { useMemo, useState } from 'react';
import ImageSlot from '@/app/admin/builder/components/ImageSlot';
import type { Banner } from '@/lib/block-types';
import BannerPresetPicker from '@/components/admin/BannerPresetPicker';
import SaveAsPresetModal from '@/components/admin/SaveAsPresetModal';
import TemplateValuesModal from '@/components/admin/TemplateValuesModal';
import { presetToBanner, type BannerPreset } from '@/lib/banner-presets-shared';

export interface BannersEditorProps {
  /** JSON string: `Banner[]` */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Store context for save-as-preset scope. When omitted, only global scope is offered. */
  storeId?: string;
  /** Whether the current user is a super admin (controls scope options in save-as-preset). */
  isSuperAdmin?: boolean;
}

function makeBanner(): Banner {
  return {
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `b-${Math.random().toString(36).slice(2)}`,
    template_id: '',
    custom_css: '',
    title: '',
    subtitle: '',
    image_url: '',
    original_price: 0,
    discount_rate: 0,
    link_url: '',
    visible: true,
  };
}

/**
 * Promotional-offer banners (the cards with image + title + discount + link).
 * Self-contained — consumes/produces the JSON string that lives on either
 * `stores.banners` or the `page_layout` banners block config.
 */
export default function BannersEditor({ value, onChange, disabled, storeId, isSuperAdmin = false }: BannersEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savePresetFor, setSavePresetFor] = useState<Banner | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  // Template flow: when a template preset is picked, open values modal
  // instead of immediately snapshotting. Also reused for editing an
  // existing template-mode banner's values.
  const [templateFlow, setTemplateFlow] = useState<{
    preset: BannerPreset;
    editingIndex?: number; // undefined = new placement
  } | null>(null);

  const banners = useMemo(() => {
    try {
      const p = JSON.parse(value || '[]');
      return Array.isArray(p) ? (p as Banner[]) : [];
    } catch {
      return [] as Banner[];
    }
  }, [value]);

  function update(next: Banner[]) {
    onChange(JSON.stringify(next));
  }

  function patchAt(i: number, patch: Partial<Banner>) {
    const next = banners.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    update(next);
  }

  function pickPreset(preset: BannerPreset) {
    setPickerOpen(false);
    if (preset.is_template) {
      setTemplateFlow({ preset });
      return;
    }
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `b-${Math.random().toString(36).slice(2)}`;
    const snapshot = presetToBanner(preset, id);
    update([...banners, snapshot as Banner]);
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">プロモーションバナー</h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddMenuOpen(v => !v)}
            className="px-3 py-1.5 bg-amber-500 text-[#0C3290] rounded-lg text-xs font-bold hover:bg-amber-600"
          >
            + バナー追加 ▾
          </button>
          {addMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                type="button"
                onClick={() => {
                  update([...banners, makeBanner()]);
                  setAddMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                空のバナーを追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(true);
                  setAddMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-t border-gray-100"
              >
                プリセットから追加
              </button>
            </div>
          )}
        </div>
      </div>

      {banners.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400 text-sm">
          バナーがありません。「+ バナー追加」で追加してください。
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((banner, i) => (
          banner.mode === 'template' ? (
            <TemplateBannerCard
              key={banner.id}
              index={i}
              banner={banner}
              onToggleVisible={v => patchAt(i, { visible: v })}
              onEdit={() => {
                // Reconstruct a minimal BannerPreset-shape for the modal from
                // the cached fields + html. Values come from initialValues.
                const pseudoPreset = {
                  id: banner.template_id || '',
                  name: banner.title || 'Template',
                  scope: 'store' as const,
                  owner_store_id: storeId || '',
                  mode: 'html' as const,
                  preview_image_url: '',
                  structured: {
                    title: '', subtitle: '', image_url: '',
                    original_price: 0, discount_rate: 0, link_url: '', custom_css: '',
                  },
                  html_content: {
                    html: banner.cached_template_html || '',
                    css: banner.cached_template_css || '',
                  },
                  combined_content: { source: '' },
                  is_template: true,
                  fields: banner.cached_template_fields || [],
                  created_at: '', updated_at: '', created_by: '',
                };
                setTemplateFlow({ preset: pseudoPreset, editingIndex: i });
              }}
              onDelete={() => update(banners.filter((_, j) => j !== i))}
            />
          ) : (
          <div key={banner.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600">バナー {i + 1}</span>
                {banner.template_id && (
                  <span className="text-[10px] text-gray-400" title={`プリセット ${banner.template_id} から作成`}>📑</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={banner.visible}
                    onChange={e => patchAt(i, { visible: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  表示
                </label>
                <button
                  type="button"
                  onClick={() => setSavePresetFor(banner)}
                  className="text-[10px] text-blue-600 hover:text-blue-800"
                  title="このバナーをプリセットとして保存"
                >
                  💾 プリセット保存
                </button>
                <button
                  type="button"
                  onClick={() => update(banners.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  削除
                </button>
              </div>
            </div>

            <ImageSlot
              label="バナー画像"
              value={banner.image_url}
              onChange={url => patchAt(i, { image_url: url })}
            />

            <input
              type="text"
              value={banner.title}
              placeholder="タイトル"
              onChange={e => patchAt(i, { title: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
            />
            <input
              type="text"
              value={banner.subtitle || ''}
              placeholder="サブタイトル（任意）"
              onChange={e => patchAt(i, { subtitle: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
            />
            <input
              type="text"
              value={banner.link_url}
              placeholder="リンクURL（任意）"
              onChange={e => patchAt(i, { link_url: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-gray-500">
                定価
                <input
                  type="number"
                  value={banner.original_price}
                  onChange={e => patchAt(i, { original_price: Number(e.target.value) || 0 })}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                />
              </label>
              <label className="text-[10px] text-gray-500">
                割引率 %
                <input
                  type="number"
                  value={banner.discount_rate}
                  onChange={e => patchAt(i, { discount_rate: Number(e.target.value) || 0 })}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                />
              </label>
            </div>
          </div>
          )
        ))}
      </div>

      <BannerPresetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pickPreset}
      />
      <SaveAsPresetModal
        open={savePresetFor !== null}
        onClose={() => setSavePresetFor(null)}
        banner={savePresetFor}
        storeId={storeId}
        isSuperAdmin={isSuperAdmin}
      />
      <TemplateValuesModal
        open={templateFlow !== null}
        onClose={() => setTemplateFlow(null)}
        preset={templateFlow?.preset ?? null}
        initialValues={
          templateFlow?.editingIndex !== undefined
            ? banners[templateFlow.editingIndex]?.template_values
            : undefined
        }
        submitLabel={templateFlow?.editingIndex !== undefined ? '更新' : '配置'}
        onSubmit={({ values, preset, cached_html, cached_css, cached_fields }) => {
          if (templateFlow?.editingIndex !== undefined) {
            // Update existing placement — refresh cache + values.
            const idx = templateFlow.editingIndex;
            update(banners.map((b, i) => (i === idx ? {
              ...b,
              template_values: values,
              cached_template_html: cached_html,
              cached_template_css: cached_css,
              cached_template_fields: cached_fields,
            } : b)));
          } else {
            // New placement.
            const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
              ? crypto.randomUUID()
              : `b-${Math.random().toString(36).slice(2)}`;
            const banner: Banner = {
              id,
              template_id: preset.id,
              custom_css: '',
              title: preset.name,
              subtitle: '',
              image_url: '',
              original_price: 0,
              discount_rate: 0,
              link_url: '',
              visible: true,
              mode: 'template',
              template_values: values,
              cached_template_html: cached_html,
              cached_template_css: cached_css,
              cached_template_fields: cached_fields,
            };
            update([...banners, banner]);
          }
          setTemplateFlow(null);
        }}
      />
    </div>
  );
}

// ─── Template-mode banner card ──────────────────────────

function TemplateBannerCard({
  index, banner, onToggleVisible, onEdit, onDelete,
}: {
  index: number;
  banner: Banner;
  onToggleVisible: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const values = banner.template_values || {};
  const fields = banner.cached_template_fields || [];
  const filled = fields.filter(f => (values[f.key] ?? '').trim() !== '').length;

  return (
    <div className="bg-white border border-[#0C3290]/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600">バナー {index + 1}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">テンプレート</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-gray-500">
            <input
              type="checkbox"
              checked={banner.visible}
              onChange={e => onToggleVisible(e.target.checked)}
              className="rounded border-gray-300"
            />
            表示
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 text-xs"
          >
            削除
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
        <div className="text-xs font-semibold text-gray-700 truncate">{banner.title || '(無題)'}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {fields.length} フィールド中 {filled} 入力済み
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="w-full py-2 px-3 bg-[#0C3290] text-white rounded-lg text-xs font-semibold hover:bg-[#0a2a7a]"
      >
        ✏️ 値を編集
      </button>
    </div>
  );
}
