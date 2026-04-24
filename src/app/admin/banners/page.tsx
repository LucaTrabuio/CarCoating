'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';
import type { BannerPreset, PresetMode, PresetScope, TemplateField } from '@/lib/banner-presets-shared';
import { splitCombinedSource, normalizeUploadedHtml } from '@/lib/banner-presets-shared';
import ImageSlot from '@/app/admin/builder/components/ImageSlot';
import { sanitizeHtml } from '@/lib/sanitize';
import { sanitizeCss } from '@/lib/sanitize-css';
import ShadowPreview from '@/components/ShadowPreview';
import TemplateFieldsPanel from '@/components/admin/TemplateFieldsPanel';
import { buildFieldSchemaFromTokens, extractTokens, substitute, autoTokenizeTextNodes } from '@/lib/banner-template';
import { STARTERS, type StarterTemplate } from './starters';

interface DraftPreset {
  id?: string;
  name: string;
  scope: PresetScope;
  owner_store_id: string;
  mode: PresetMode;
  preview_image_url: string;
  structured: {
    title: string;
    subtitle: string;
    image_url: string;
    original_price: number;
    discount_rate: number;
    link_url: string;
    custom_css: string;
  };
  html_content: { html: string; css: string };
  combined_content: { source: string };
  is_template: boolean;
  fields: TemplateField[];
}

function emptyDraft(isSuperAdmin: boolean, defaultStoreId: string): DraftPreset {
  return {
    name: '',
    scope: isSuperAdmin ? 'global' : 'store',
    owner_store_id: isSuperAdmin ? '' : defaultStoreId,
    mode: 'structured',
    preview_image_url: '',
    structured: {
      title: '', subtitle: '', image_url: '',
      original_price: 0, discount_rate: 0, link_url: '', custom_css: '',
    },
    html_content: { html: '', css: '' },
    combined_content: { source: '' },
    is_template: false,
    fields: [],
  };
}

function fromStarter(s: StarterTemplate, isSuperAdmin: boolean, defaultStoreId: string): DraftPreset {
  const base = emptyDraft(isSuperAdmin, defaultStoreId);

  // Auto-derive fields if the starter is flagged as a template but doesn't
  // provide an explicit schema.
  let fields: TemplateField[] = s.fields ? s.fields.map(f => ({ ...f })) : [];
  if (s.is_template && fields.length === 0) {
    let html = '';
    let css = '';
    if (s.mode === 'combined' && s.combined_content) {
      const split = splitCombinedSource(s.combined_content.source);
      html = split.html;
      css = split.css;
    } else if (s.mode === 'html' && s.html_content) {
      html = s.html_content.html;
      css = s.html_content.css;
    }
    fields = buildFieldSchemaFromTokens(extractTokens(html, css));
  }

  return {
    ...base,
    name: s.name,
    mode: s.mode,
    structured: s.structured
      ? { ...base.structured, ...s.structured, image_url: '' }
      : base.structured,
    html_content: s.html_content ?? base.html_content,
    combined_content: s.combined_content ?? base.combined_content,
    is_template: s.is_template ?? false,
    fields,
  };
}

function toDraft(p: BannerPreset): DraftPreset {
  return {
    id: p.id,
    name: p.name,
    scope: p.scope,
    owner_store_id: p.owner_store_id,
    mode: p.mode,
    preview_image_url: p.preview_image_url,
    structured: { ...p.structured },
    html_content: { ...p.html_content },
    combined_content: { ...p.combined_content },
    is_template: p.is_template,
    fields: p.fields.map(f => ({ ...f })),
  };
}

export default function BannerMakerPage() {
  const user = useAdminAuth();
  const isSuperAdmin = user.role === 'super_admin';
  const defaultStoreId = user.managed_stores[0] || '';

  const [presets, setPresets] = useState<BannerPreset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPreset | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/banner-presets', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setError('名前を入力してください'); return; }
    if (draft.scope === 'store' && !draft.owner_store_id) { setError('ストアを選択してください'); return; }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: draft.name.trim(),
        scope: draft.scope,
        owner_store_id: draft.scope === 'store' ? draft.owner_store_id : '',
        mode: draft.mode,
        preview_image_url: draft.preview_image_url,
        structured: draft.structured,
        html_content: draft.html_content,
        combined_content: draft.combined_content,
        is_template: draft.is_template,
        fields: draft.fields,
      };
      const res = draft.id
        ? await fetch(`/api/admin/banner-presets/${draft.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          })
        : await fetch('/api/admin/banner-presets', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `HTTP ${res.status}`);
      }
      await load();
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm('このプリセットを削除しますか？既存の配置（スナップショット）は影響を受けません。')) return;
    try {
      const res = await fetch(`/api/admin/banner-presets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  }

  if (!isSuperAdmin && user.managed_stores.length === 0) {
    return <div className="p-8 text-gray-500">アクセス権限がありません。</div>;
  }

  const hasPresets = presets && presets.length > 0;

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-[#0a1e5a] via-[#0C3290] to-[#1e40af] text-white px-6 md:px-10 py-8 md:py-10">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse at top right, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top right, black, transparent 70%)',
          }}
        />
        <div aria-hidden className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[#F0EA01]/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F0EA01]/15 text-[#F0EA01] text-[10px] font-bold tracking-[0.15em] mb-3">
              <span>📑</span>
              <span>BANNER MAKER</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">バナーメーカー</h1>
            <p className="mt-1.5 text-sm text-white/70 leading-relaxed">
              再利用可能なバナープリセットを作成し、ページビルダーから好きな位置に配置できます。HTMLモードでは外部サイト（Webflow、uiverse.io など）で作ったデザインの貼り付けも可能です。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft(isSuperAdmin, defaultStoreId))}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-[#F0EA01] text-[#0C3290] rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <span className="text-base">+</span>
            <span>新しいプリセット</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Empty state — rich starters gallery */}
      {!presets && <LoadingSkeleton />}
      {presets && !hasPresets && (
        <EmptyStateWithStarters
          starters={STARTERS}
          onPickStarter={s => setDraft(fromStarter(s, isSuperAdmin, defaultStoreId))}
          onBlank={() => setDraft(emptyDraft(isSuperAdmin, defaultStoreId))}
        />
      )}

      {/* Grid of preset cards */}
      {hasPresets && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-800">
              保存済みプリセット <span className="text-gray-400 font-normal">({presets.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map(p => (
              <PresetCard
                key={p.id}
                preset={p}
                onEdit={() => setDraft(toDraft(p))}
                onDelete={() => del(p.id)}
              />
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="text-sm font-semibold text-gray-800 mb-3">スターターから作成</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {STARTERS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDraft(fromStarter(s, isSuperAdmin, defaultStoreId))}
                  className="group flex flex-col items-center text-center p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:shadow-sm transition"
                >
                  <span className="text-2xl mb-1.5 transition-transform group-hover:scale-110">{s.emoji}</span>
                  <span className="text-xs font-semibold text-gray-800">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {draft && (
        <DraftEditor
          draft={draft}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={save}
          busy={busy}
          isSuperAdmin={isSuperAdmin}
          managedStores={user.managed_stores}
        />
      )}
    </div>
  );
}

// ─── Preset card with live thumbnail preview ────────

function PresetCard({ preset, onEdit, onDelete }: {
  preset: BannerPreset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const combined = preset.mode === 'combined' ? splitCombinedSource(preset.combined_content.source || '') : null;
  const previewHtml =
    preset.mode === 'html' ? sanitizeHtml(preset.html_content.html || '')
    : combined ? sanitizeHtml(combined.html)
    : '';
  const previewCss =
    preset.mode === 'html' ? sanitizeCss(preset.html_content.css || '')
    : combined ? sanitizeCss(combined.css)
    : sanitizeCss(preset.structured.custom_css || '');
  const discounted = preset.structured.original_price > 0 && preset.structured.discount_rate > 0
    ? Math.round(preset.structured.original_price * (1 - preset.structured.discount_rate / 100))
    : null;

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
      {/* Live preview (or uploaded thumbnail if set) */}
      <div className="relative bg-gray-50 border-b border-gray-100 aspect-[16/9] overflow-hidden flex items-center justify-center">
        {preset.preview_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preset.preview_image_url}
            alt={preset.name}
            className="w-full h-full object-cover"
          />
        ) : (
        <div className="absolute inset-0 scale-[0.55] origin-center pointer-events-none">
          {preset.mode === 'html' || preset.mode === 'combined' ? (
            <ShadowPreview
              html={previewHtml}
              css={previewCss}
              className="rounded-xl overflow-hidden bg-white"
            />
          ) : (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              {preset.structured.image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preset.structured.image_url} alt="" className="w-full h-[180px] object-cover" />
              )}
              <div className="p-5">
                <h3 className="font-bold text-base text-[#0C3290] mb-1">{preset.structured.title || '(タイトル)'}</h3>
                {preset.structured.subtitle && <p className="text-xs text-slate-500 mb-3">{preset.structured.subtitle}</p>}
                {preset.structured.original_price > 0 && (
                  <div className="flex items-baseline gap-2">
                    {discounted !== null ? (
                      <>
                        <span className="text-xs text-slate-400 line-through">¥{preset.structured.original_price.toLocaleString()}</span>
                        <span className="text-lg font-bold text-red-600">¥{discounted.toLocaleString()}</span>
                        <span className="text-[10px] text-red-500 font-bold">{preset.structured.discount_rate}%OFF</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-[#0C3290]">¥{preset.structured.original_price.toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
        {/* Hover action overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1.5 bg-white text-gray-800 rounded-md text-xs font-semibold shadow hover:bg-gray-50"
          >
            編集
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-semibold shadow hover:bg-red-600"
          >
            削除
          </button>
        </div>
      </div>
      {/* Meta */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">{preset.name}</div>
            <div className="text-[10px] text-gray-400 truncate">
              {preset.scope === 'global' ? 'グローバル' : `ストア: ${preset.owner_store_id}`}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${preset.scope === 'global' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {preset.scope === 'global' ? 'G' : 'S'}
            </span>
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
              preset.mode === 'html' ? 'bg-purple-100 text-purple-700'
              : preset.mode === 'combined' ? 'bg-indigo-100 text-indigo-700'
              : 'bg-amber-100 text-amber-700'
            }`}>
              {preset.mode === 'html' ? 'HTML' : preset.mode === 'combined' ? 'MIX' : 'STR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────

function EmptyStateWithStarters({ starters, onPickStarter, onBlank }: {
  starters: StarterTemplate[];
  onPickStarter: (s: StarterTemplate) => void;
  onBlank: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 py-10 text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">最初のプリセットを作りましょう</h2>
        <p className="text-sm text-gray-500 max-w-lg mx-auto">
          スターターテンプレートから始めるのが一番簡単。あるいは、空のプリセットから HTML/CSS を自由に書くこともできます。
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={onBlank}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span>🧱</span>
            <span>空のプリセットから始める</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 tracking-widest">またはスターターから選ぶ</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {starters.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPickStarter(s)}
              className="group text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0C3290] hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl transition-transform group-hover:scale-110">{s.emoji}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.mode === 'html' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                  {s.mode === 'html' ? 'HTML' : 'Structured'}
                </span>
              </div>
              <div className="font-bold text-sm text-gray-900 mb-0.5">{s.name}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{s.description}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0C3290] opacity-0 group-hover:opacity-100 transition">
                このテンプレートで始める →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="aspect-[16/9] bg-gray-100 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
            <div className="h-2 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Draft editor (drawer) ───────────────────────────

function DraftEditor({
  draft, onChange, onClose, onSave, busy, isSuperAdmin, managedStores,
}: {
  draft: DraftPreset;
  onChange: (d: DraftPreset) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
  isSuperAdmin: boolean;
  managedStores: string[];
}) {
  // Resolve raw HTML+CSS from the current mode.
  const rawHtmlCss = useMemo(() => {
    if (draft.mode === 'combined') return splitCombinedSource(draft.combined_content.source || '');
    if (draft.mode === 'html') return { html: draft.html_content.html || '', css: draft.html_content.css || '' };
    return { html: '', css: draft.structured.custom_css || '' };
  }, [draft.mode, draft.html_content.html, draft.html_content.css, draft.combined_content.source, draft.structured.custom_css]);

  // If template mode is on, substitute field defaults so the author-preview
  // reflects how a placement would render with no values filled in.
  const resolved = useMemo(() => {
    if (draft.is_template && (draft.mode === 'html' || draft.mode === 'combined')) {
      return substitute(rawHtmlCss.html, rawHtmlCss.css, draft.fields, {});
    }
    return rawHtmlCss;
  }, [draft.is_template, draft.mode, rawHtmlCss, draft.fields]);

  const previewHtml = useMemo(
    () => (draft.mode === 'html' || draft.mode === 'combined') ? sanitizeHtml(resolved.html) : '',
    [draft.mode, resolved.html],
  );

  const previewCss = useMemo(
    () => sanitizeCss(resolved.css),
    [resolved.css],
  );

  function patch<K extends keyof DraftPreset>(k: K, v: DraftPreset[K]) { onChange({ ...draft, [k]: v }); }
  function patchStructured<K extends keyof DraftPreset['structured']>(k: K, v: DraftPreset['structured'][K]) {
    onChange({ ...draft, structured: { ...draft.structured, [k]: v } });
  }
  function patchHtml<K extends keyof DraftPreset['html_content']>(k: K, v: DraftPreset['html_content'][K]) {
    onChange({ ...draft, html_content: { ...draft.html_content, [k]: v } });
  }
  function patchCombined<K extends keyof DraftPreset['combined_content']>(k: K, v: DraftPreset['combined_content'][K]) {
    onChange({ ...draft, combined_content: { ...draft.combined_content, [k]: v } });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[1100px] h-full overflow-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📑</span>
            <h2 className="text-base font-bold text-gray-900">
              {draft.id ? 'プリセット編集' : '新しいプリセット'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !draft.name.trim()}
              className="px-4 py-1.5 text-sm bg-[#0C3290] text-white font-semibold rounded-lg hover:bg-[#0a2a7a] disabled:opacity-50"
            >
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 flex-1">
          {/* Left: form */}
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">プリセット名</span>
              <input
                type="text"
                value={draft.name}
                onChange={e => patch('name', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="例: 春のキャンペーン"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-semibold text-gray-600">スコープ</span>
                <select
                  value={draft.scope}
                  onChange={e => patch('scope', e.target.value as PresetScope)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {isSuperAdmin && <option value="global">グローバル（全ストア）</option>}
                  <option value="store">ストア専用</option>
                </select>
              </div>
              {draft.scope === 'store' && (
                <div>
                  <span className="text-xs font-semibold text-gray-600">所有ストア</span>
                  <select
                    value={draft.owner_store_id}
                    onChange={e => patch('owner_store_id', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    disabled={!isSuperAdmin && managedStores.length <= 1}
                  >
                    <option value="">（選択）</option>
                    {managedStores.map(sid => <option key={sid} value={sid}>{sid}</option>)}
                    {isSuperAdmin && !managedStores.includes(draft.owner_store_id) && draft.owner_store_id && (
                      <option value={draft.owner_store_id}>{draft.owner_store_id}</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-gray-600">プレビュー画像（任意）</span>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed max-w-sm">
                    一覧・ピッカーで表示されるサムネイル画像。指定しない場合は HTML/CSS から自動生成されたライブプレビューが使われます。
                  </p>
                </div>
                {draft.preview_image_url && (
                  <button
                    type="button"
                    onClick={() => patch('preview_image_url', '')}
                    className="text-[10px] text-red-500 hover:text-red-700 shrink-0"
                  >
                    クリア
                  </button>
                )}
              </div>
              <div className="mt-2">
                <ImageSlot
                  label=""
                  value={draft.preview_image_url || undefined}
                  aspectRatio="16/9"
                  onChange={url => patch('preview_image_url', url)}
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-600">モード</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {([
                  { m: 'structured' as const, emoji: '🧩', label: '構造化', desc: 'フィールド + CSS' },
                  { m: 'html' as const, emoji: '💻', label: 'HTML', desc: 'HTML と CSS を別枠で' },
                  { m: 'combined' as const, emoji: '🧷', label: 'コンバイン', desc: 'HTML+CSS を1つの入力に' },
                ]).map(({ m, emoji, label, desc }) => (
                  <label
                    key={m}
                    className={`border rounded-lg p-3 text-sm cursor-pointer transition ${
                      draft.mode === m
                        ? 'border-[#0C3290] bg-blue-50 ring-1 ring-[#0C3290]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={draft.mode === m}
                      onChange={() => patch('mode', m)}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <div className="min-w-0">
                        <div className="font-semibold">{label}</div>
                        <div className="text-[10px] text-gray-500 leading-tight">{desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {draft.mode === 'combined' ? (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-[11px] text-blue-800">
                  <strong>コンバインモード:</strong> HTML と <code>&lt;style&gt;...&lt;/style&gt;</code> を1つのボックスに一緒に貼り付けできます。
                  保存 / 表示時に <code>&lt;style&gt;</code> ブロックは自動的に取り出して適用されます。
                  CodePen・Webflow のエクスポート・uiverse などから丸ごと貼り付けやすいモードです。
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">HTML + CSS（&lt;style&gt;タグ埋め込み可）</span>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#0C3290] bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                    <span>📂</span>
                    <span>HTMLファイルをインポート</span>
                    <input
                      type="file"
                      accept=".html,.htm,text/html"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const normalized = normalizeUploadedHtml(text);
                          patchCombined('source', normalized);
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました');
                        }
                      }}
                    />
                  </label>
                </div>
                <textarea
                  value={draft.combined_content.source}
                  onChange={e => patchCombined('source', e.target.value)}
                  rows={20}
                  placeholder={`<style>\n  .my-banner { background: #0C3290; color: white; padding: 2rem; }\n  .my-banner h3 { font-size: 1.5rem; }\n</style>\n\n<div class="my-banner">\n  <h3>タイトル</h3>\n  <p>説明文</p>\n</div>`}
                  spellCheck={false}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50"
                />
              </div>
            ) : draft.mode === 'structured' ? (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <ImageSlot
                  label="バナー画像"
                  value={draft.structured.image_url}
                  onChange={url => patchStructured('image_url', url)}
                />
                <input
                  type="text"
                  value={draft.structured.title}
                  placeholder="タイトル"
                  onChange={e => patchStructured('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={draft.structured.subtitle}
                  placeholder="サブタイトル（任意）"
                  onChange={e => patchStructured('subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={draft.structured.link_url}
                  placeholder="リンクURL（任意）"
                  onChange={e => patchStructured('link_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-500">
                    定価
                    <input
                      type="number"
                      value={draft.structured.original_price}
                      onChange={e => patchStructured('original_price', Number(e.target.value) || 0)}
                      className="mt-0.5 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    割引率 %
                    <input
                      type="number"
                      value={draft.structured.discount_rate}
                      onChange={e => patchStructured('discount_rate', Number(e.target.value) || 0)}
                      className="mt-0.5 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">カスタムCSS（任意）</span>
                  <textarea
                    value={draft.structured.custom_css}
                    onChange={e => patchStructured('custom_css', e.target.value)}
                    rows={8}
                    placeholder=".banner-root { background: linear-gradient(...); }"
                    spellCheck={false}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                  <strong>HTMLモード:</strong> <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;form&gt;</code>,
                  イベントハンドラは自動的に除去されます。
                  <code>class</code> / <code>style</code> 属性は利用可能です。
                  Tailwind クラス名はビルド時に認識されないため、CSSボックスに書いてください。
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">HTML</span>
                  <textarea
                    value={draft.html_content.html}
                    onChange={e => patchHtml('html', e.target.value)}
                    rows={10}
                    placeholder={`<div class="my-banner">\n  <h3>タイトル</h3>\n</div>`}
                    spellCheck={false}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">CSS</span>
                  <textarea
                    value={draft.html_content.css}
                    onChange={e => patchHtml('css', e.target.value)}
                    rows={10}
                    placeholder={`.my-banner {\n  background: #0C3290;\n  color: white;\n  padding: 2rem;\n}`}
                    spellCheck={false}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono bg-gray-50"
                  />
                </label>
              </div>
            )}

            {/* Template section — applies to html + combined modes (structured has its own fields) */}
            {(draft.mode === 'html' || draft.mode === 'combined') && (
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  draft.is_template ? 'border-[#0C3290] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={draft.is_template}
                    onChange={e => {
                      const is_template = e.target.checked;
                      if (is_template && draft.fields.length === 0) {
                        // Auto-extract on first enable.
                        const html = draft.mode === 'combined' ? splitCombinedSource(draft.combined_content.source).html : draft.html_content.html;
                        const css = draft.mode === 'combined' ? splitCombinedSource(draft.combined_content.source).css : draft.html_content.css;
                        const extracted = extractTokens(html, css);
                        onChange({ ...draft, is_template: true, fields: buildFieldSchemaFromTokens(extracted) });
                      } else {
                        patch('is_template', is_template);
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">テンプレートにする（パラメーター化）</div>
                    <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                      HTML内の <code className="text-gray-800">{`{{名前}}`}</code> や CSS内の <code className="text-gray-800">var(--名前, デフォルト)</code> を配置時に編集できるフィールドに変換します。
                      配置後はテキストや色・サイズだけが変更可能になり、HTML/CSSは触れなくなります。
                    </div>
                  </div>
                </label>

                {draft.is_template && (() => {
                  const html = draft.mode === 'combined'
                    ? splitCombinedSource(draft.combined_content.source).html
                    : draft.html_content.html;
                  const css = draft.mode === 'combined'
                    ? splitCombinedSource(draft.combined_content.source).css
                    : draft.html_content.css;
                  return (
                    <TemplateFieldsPanel
                      html={html}
                      css={css}
                      fields={draft.fields}
                      onChange={fields => patch('fields', fields)}
                      onAutoTokenize={() => {
                        const { html: newHtml, fields: newFields } = autoTokenizeTextNodes(html, draft.fields);
                        if (draft.mode === 'combined') {
                          // Preserve the <style> block: reassemble style + tokenized body.
                          const styleBlock = css ? `<style>\n${css}\n</style>\n\n` : '';
                          patchCombined('source', styleBlock + newHtml);
                        } else if (draft.mode === 'html') {
                          patchHtml('html', newHtml);
                        }
                        patch('fields', newFields);
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right: live preview */}
          <div className="lg:sticky lg:top-16 lg:self-start">
            <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
              <span>プレビュー</span>
              <span className="text-[10px] font-normal text-gray-400">リアルタイム更新</span>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-5 min-h-[320px] flex items-center justify-center">
              <div className="w-full max-w-[500px]">
                {draft.mode === 'html' || draft.mode === 'combined' ? (
                  <ShadowPreview
                    html={previewHtml || '<div style="padding:2rem;color:#9ca3af;text-align:center;font-size:13px;font-family:sans-serif;">HTMLを入力するとここにプレビューが表示されます</div>'}
                    css={previewCss}
                    className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm"
                  />
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                    {draft.structured.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={draft.structured.image_url} alt={draft.structured.title} className="w-full h-[180px] object-cover" />
                    ) : (
                      <div className="h-[180px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-xs">画像未設定</div>
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-base text-[#0C3290] mb-1">{draft.structured.title || '（タイトル未設定）'}</h3>
                      {draft.structured.subtitle && <p className="text-xs text-slate-500 mb-3">{draft.structured.subtitle}</p>}
                      {draft.structured.original_price > 0 && (
                        <div className="flex items-baseline gap-2">
                          {draft.structured.discount_rate > 0 ? (
                            <>
                              <span className="text-xs text-slate-400 line-through">¥{draft.structured.original_price.toLocaleString()}</span>
                              <span className="text-lg font-bold text-red-600">
                                ¥{Math.round(draft.structured.original_price * (1 - draft.structured.discount_rate / 100)).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-red-500 font-bold">{draft.structured.discount_rate}%OFF</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-[#0C3290]">¥{draft.structured.original_price.toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {previewCss && <style dangerouslySetInnerHTML={{ __html: previewCss }} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
