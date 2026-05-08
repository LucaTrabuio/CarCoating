'use client';

import { useMemo, useState } from 'react';
import type { BannerPreset, TemplateField } from '@/lib/banner-presets-shared';
import { substitute } from '@/lib/banner-template';
import { sanitizeCss } from '@/lib/sanitize-css';
import { sanitizeHtml } from '@/lib/sanitize';
import ShadowPreview from '@/components/ShadowPreview';
import ImageSlot from '@/app/admin/builder/components/ImageSlot';
import { splitCombinedSource } from '@/lib/banner-presets-shared';

export interface TemplateValuesModalProps {
  open: boolean;
  onClose: () => void;
  preset: BannerPreset | null;
  /** Initial values for editing an existing placement. Empty for fresh placements. */
  initialValues?: Record<string, string>;
  onSubmit: (params: {
    values: Record<string, string>;
    preset: BannerPreset;
    cached_html: string;
    cached_css: string;
    cached_fields: TemplateField[];
  }) => void;
  submitLabel?: string;
}

/**
 * Modal shown when placing a template preset (picker → here → inserts banner)
 * or when editing an existing template-mode banner's values. Renders a typed
 * form based on the preset's field schema + live preview.
 */
export default function TemplateValuesModal({
  open,
  onClose,
  preset,
  initialValues,
  onSubmit,
  submitLabel = '配置',
}: TemplateValuesModalProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});

  // Resolve template html/css depending on preset mode.
  const templateBody = useMemo(() => {
    if (!preset) return { html: '', css: '' };
    if (preset.mode === 'combined') return splitCombinedSource(preset.combined_content.source || '');
    if (preset.mode === 'html') return { html: preset.html_content.html || '', css: preset.html_content.css || '' };
    return { html: '', css: '' };
  }, [preset]);

  const fields = preset?.fields ?? [];
  const visibleFields = useMemo(() => fields.filter(f => f.editable !== false), [fields]);

  const resolved = useMemo(
    () => substitute(templateBody.html, templateBody.css, fields, values),
    [templateBody, fields, values],
  );
  const previewHtml = useMemo(() => sanitizeHtml(resolved.html), [resolved.html]);
  const previewCss = useMemo(() => sanitizeCss(resolved.css), [resolved.css]);

  if (!open || !preset) return null;

  function setValue(key: string, v: string) {
    setValues(prev => ({ ...prev, [key]: v }));
  }

  function submit() {
    if (!preset) return;
    onSubmit({
      values,
      preset,
      cached_html: templateBody.html,
      cached_css: templateBody.css,
      cached_fields: fields,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{preset.name}</h2>
            <div className="text-[10px] text-gray-500 mt-0.5">テンプレート · フィールドを入力して配置</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 p-5">
          {/* Form */}
          <div className="space-y-3">
            {visibleFields.length === 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-4 text-xs text-gray-500 text-center">
                編集可能なフィールドはありません。そのまま配置してください。
              </div>
            )}
            {visibleFields.map(field => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] ?? field.default ?? ''}
                onChange={v => setValue(field.key, v)}
              />
            ))}
          </div>

          {/* Live preview */}
          <div className="md:sticky md:top-0 md:self-start">
            <div className="text-xs font-semibold text-gray-600 mb-2">プレビュー</div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4">
              <ShadowPreview
                html={previewHtml}
                css={previewCss}
                className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-4 py-1.5 text-sm bg-[#0C3290] text-white font-semibold rounded-lg hover:bg-[#0a2a7a]"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  const placeholder = field.placeholder || field.default || '';
  const labelNode = (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-700">{field.label}</span>
      <span className="text-[10px] text-gray-400 font-mono">{field.key}</span>
    </div>
  );

  switch (field.type) {
    case 'textarea':
      return (
        <label className="block">
          {labelNode}
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </label>
      );
    case 'color':
      return (
        <label className="block">
          {labelNode}
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6,8}$/i.test(value) ? value.slice(0, 7) : '#000000'}
              onChange={e => onChange(e.target.value)}
              className="h-9 w-14 border border-gray-200 rounded cursor-pointer"
            />
            <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
            />
          </div>
        </label>
      );
    case 'number': {
      const unit = field.unit || '';
      return (
        <label className="block">
          {labelNode}
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              value={value}
              onChange={e => onChange(e.target.value)}
              min={field.min}
              max={field.max}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {unit && <span className="text-xs text-gray-500 shrink-0 w-10">{unit}</span>}
          </div>
        </label>
      );
    }
    case 'select':
      return (
        <label className="block">
          {labelNode}
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {(field.options ?? []).length === 0 && <option value="">（選択肢未設定）</option>}
            {(field.options ?? []).map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      );
    case 'image_url':
      return (
        <div>
          {labelNode}
          <div className="mt-1">
            <ImageSlot
              label=""
              value={value || undefined}
              aspectRatio="16/9"
              onChange={url => onChange(url)}
            />
          </div>
        </div>
      );
    case 'url':
      return (
        <label className="block">
          {labelNode}
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || 'https://…'}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </label>
      );
    default:
      return (
        <label className="block">
          {labelNode}
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </label>
      );
  }
}
