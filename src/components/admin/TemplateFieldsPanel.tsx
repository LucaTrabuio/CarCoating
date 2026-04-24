'use client';

import { useMemo } from 'react';
import type { TemplateField, TemplateFieldType } from '@/lib/banner-presets-shared';
import { buildFieldSchemaFromTokens, extractTokens, humanizeLabel, pruneFieldsToExtracted } from '@/lib/banner-template';

export interface TemplateFieldsPanelProps {
  /** Current HTML source (either mode='html' .html_content.html or extracted from combined). */
  html: string;
  /** Current CSS source. */
  css: string;
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
  /**
   * Optional callback: when present, the panel shows a "text auto-tokenize"
   * button that computes a new HTML + fields schema and hands it back to the
   * parent to apply (the parent owns the HTML textarea). If omitted, only the
   * rescan button is shown.
   */
  onAutoTokenize?: () => void;
}

const TYPE_OPTIONS: { value: TemplateFieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'textarea', label: '長文テキスト' },
  { value: 'color', label: '色' },
  { value: 'number', label: '数値' },
  { value: 'select', label: '選択' },
  { value: 'image_url', label: '画像URL' },
  { value: 'url', label: 'リンクURL' },
];

/**
 * Template-author view: shows the auto-detected fields (extracted from
 * `{{name}}` and `var(--name, default)` tokens) and lets the author rename,
 * change types, set defaults, reorder, or remove. Also exposes a rescan
 * button to sync with the current HTML/CSS after edits.
 */
export default function TemplateFieldsPanel({ html, css, fields, onChange, onAutoTokenize }: TemplateFieldsPanelProps) {
  const extracted = useMemo(() => extractTokens(html, css), [html, css]);

  const unusedFields = useMemo(
    () => fields.filter(f => !extracted.text.includes(f.key) && !extracted.vars.some(v => v.name === f.key)),
    [fields, extracted],
  );

  function rescan() {
    // Keep user-customized labels/types/defaults for still-present tokens.
    // Drop fields whose tokens were removed.
    const pruned = pruneFieldsToExtracted(extracted, fields);
    const rebuilt = buildFieldSchemaFromTokens(extracted, pruned);
    onChange(rebuilt);
  }

  function updateAt(i: number, patch: Partial<TemplateField>) {
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function removeAt(i: number) {
    onChange(fields.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-700">フィールド</div>
          <div className="text-[10px] text-gray-500">
            {extracted.text.length + extracted.vars.length} 個のトークンが検出されました
            {unusedFields.length > 0 && <span className="ml-1 text-amber-600">（{unusedFields.length} 個の未使用フィールド）</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onAutoTokenize && (
            <button
              type="button"
              onClick={onAutoTokenize}
              className="text-xs px-2.5 py-1 rounded bg-[#0C3290] text-white font-semibold hover:bg-[#0a2a7a]"
              title="HTMLの既存テキストを {{token}} に自動変換して編集可能にします"
            >
              ✨ テキストを自動抽出
            </button>
          )}
          <button
            type="button"
            onClick={rescan}
            className="text-xs px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
            title="現在のHTML/CSSを再スキャンしてフィールドを同期"
          >
            🔄 再スキャン
          </button>
        </div>
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-[11px] text-gray-500 text-center">
          <div className="font-semibold text-gray-700 mb-0.5">フィールドがまだありません</div>
          <div className="mb-2">
            HTML内の見出しや段落などのテキストを自動的に編集可能なフィールドに変換できます。
          </div>
          {onAutoTokenize && (
            <button
              type="button"
              onClick={onAutoTokenize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0C3290] text-white rounded-md text-[11px] font-semibold hover:bg-[#0a2a7a]"
            >
              ✨ HTMLのテキストを自動抽出
            </button>
          )}
          <div className="mt-2 text-[10px] text-gray-400">
            または手動で <code className="text-gray-600">{`{{名前}}`}</code> や <code className="text-gray-600">var(--名前, デフォルト)</code> を追加
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {fields.map((f, i) => {
            const tokenStillPresent = extracted.text.includes(f.key) || extracted.vars.some(v => v.name === f.key);
            return (
              <div key={`${f.key}-${i}`} className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                      {f.origin === 'css' ? 'var(--' : '{{'}{f.key}{f.origin === 'css' ? ')' : '}}'}
                    </span>
                    {!tokenStillPresent && (
                      <span className="text-[10px] text-amber-600" title="このトークンはHTML/CSSに見つかりません">⚠</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-default px-1 text-xs"
                      title="上へ"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === fields.length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-default px-1 text-xs"
                      title="下へ"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="text-red-400 hover:text-red-600 px-1 text-xs"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <label className="text-[10px] text-gray-500">
                    ラベル
                    <input
                      type="text"
                      value={f.label}
                      onChange={e => updateAt(i, { label: e.target.value })}
                      placeholder={humanizeLabel(f.key)}
                      className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-gray-500">
                    型
                    <select
                      value={f.type}
                      onChange={e => updateAt(i, { type: e.target.value as TemplateFieldType })}
                      className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                    >
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <label className="text-[10px] text-gray-500 col-span-2">
                    デフォルト値
                    {f.type === 'color' ? (
                      <div className="mt-0.5 flex gap-1">
                        <input
                          type="color"
                          value={/^#[0-9a-f]{6,8}$/i.test(f.default) ? f.default.slice(0, 7) : '#000000'}
                          onChange={e => updateAt(i, { default: e.target.value })}
                          className="h-7 w-10 border border-gray-200 rounded"
                        />
                        <input
                          type="text"
                          value={f.default}
                          onChange={e => updateAt(i, { default: e.target.value })}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs font-mono"
                        />
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={f.default}
                        onChange={e => updateAt(i, { default: e.target.value })}
                        rows={2}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                      />
                    ) : f.type === 'number' ? (
                      <div className="mt-0.5 flex gap-1">
                        <input
                          type="number"
                          value={f.default}
                          onChange={e => updateAt(i, { default: e.target.value })}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                        />
                        <input
                          type="text"
                          value={f.unit || ''}
                          onChange={e => updateAt(i, { unit: e.target.value })}
                          placeholder="単位"
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-xs"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={f.default}
                        onChange={e => updateAt(i, { default: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                      />
                    )}
                  </label>
                </div>

                {f.type === 'select' && (
                  <label className="text-[10px] text-gray-500 block">
                    選択肢（改行で区切る）
                    <textarea
                      value={(f.options || []).join('\n')}
                      onChange={e => updateAt(i, { options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                      rows={3}
                      placeholder={'Noto Sans JP\nNoto Serif JP\nKosugi Maru'}
                      className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
