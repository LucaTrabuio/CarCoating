/**
 * Client-safe exports for banner-presets. Pure types + visibility helpers +
 * preset→banner snapshot — all free of firebase-admin imports so client
 * components can use them without pulling in node-only code.
 */

export type PresetScope = 'global' | 'store';
export type PresetMode = 'structured' | 'html' | 'combined';

/** Field types for parameterized (template) presets. */
export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'color'
  | 'number'
  | 'select'
  | 'image_url'
  | 'url';

export interface TemplateField {
  /** Matches `{{key}}` in HTML or `var(--key)` in CSS. */
  key: string;
  /** Display label in the editor. */
  label: string;
  type: TemplateFieldType;
  /** Default / fallback value (also the original default from `var(--key, …)`). */
  default: string;
  placeholder?: string;
  /** Options for `type:'select'`. */
  options?: string[];
  min?: number;
  max?: number;
  /** Unit appended to numeric values when substituting into CSS, e.g. 'rem', 'px'. */
  unit?: string;
  /** When false, the field is treated as static — hidden from placement UI. */
  editable?: boolean;
  /** Location hint for tooling ('html' = token found in HTML; 'css' = from `var(--…)`). */
  origin?: 'html' | 'css';
}

export interface BannerPresetStructured {
  title: string;
  subtitle: string;
  image_url: string;
  original_price: number;
  discount_rate: number;
  link_url: string;
  custom_css: string;
}

export interface BannerPresetHtml {
  html: string;
  css: string;
}

/**
 * "Combined" mode: user pastes a single blob of HTML that may contain
 * `<style>...</style>` blocks inline. At render time the style blocks are
 * extracted into scoped CSS and the rest is sanitized as HTML.
 */
export interface BannerPresetCombined {
  source: string;
}

export interface BannerPreset {
  id: string;
  name: string;
  scope: PresetScope;
  owner_store_id: string;
  mode: PresetMode;
  /**
   * Optional user-uploaded thumbnail shown in the preset gallery + picker.
   * Rendering on the storefront still uses the full HTML/CSS/structured data.
   */
  preview_image_url: string;
  structured: BannerPresetStructured;
  html_content: BannerPresetHtml;
  combined_content: BannerPresetCombined;
  /**
   * When true, the preset is a parameterized template: stores a field schema
   * that's presented to the placer as a simple form. Placements store values,
   * not snapshots — the structure stays centrally owned.
   */
  is_template: boolean;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface VisibilityUser {
  role: 'super_admin' | 'store_admin';
  managed_stores: string[];
}

function emptyStructured(): BannerPresetStructured {
  return {
    title: '',
    subtitle: '',
    image_url: '',
    original_price: 0,
    discount_rate: 0,
    link_url: '',
    custom_css: '',
  };
}

function emptyHtml(): BannerPresetHtml {
  return { html: '', css: '' };
}

function emptyCombined(): BannerPresetCombined {
  return { source: '' };
}

/**
 * Split a combined HTML+CSS source into separate `html` and `css` pieces
 * by lifting `<style>…</style>` blocks out of the markup. Pure; safe on the
 * client. The caller is still responsible for sanitizing each piece.
 */
/**
 * Normalize an uploaded HTML file into a combined-mode source string.
 *
 * - If the file is a full document (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`),
 *   we extract the `<style>` blocks from `<head>` + the inner body.
 * - If the file is a bare fragment, we return it unchanged.
 *
 * The result is a string suitable for the "combined" mode textarea.
 */
export function normalizeUploadedHtml(raw: string): string {
  if (!raw) return '';
  let src = raw.replace(/^﻿/, ''); // strip BOM

  // Drop doctype + html/head/body wrappers if present, but keep their
  // contents so inline <style> survives and renders.
  src = src.replace(/<!DOCTYPE[^>]*>/gi, '');
  src = src.replace(/<\?xml[^?]*\?>/gi, '');

  // Extract <head>…</head> contents (mainly for <style> blocks).
  let headInner = '';
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(src);
  if (headMatch) headInner = headMatch[1];

  // Extract <body>…</body> contents when present.
  let bodyInner = src;
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(src);
  if (bodyMatch) bodyInner = bodyMatch[1];

  // Strip <html> wrappers from the fallback path.
  bodyInner = bodyInner.replace(/<\/?html[^>]*>/gi, '');

  // Keep only <style> blocks from head (drop <link>, <meta>, <title>, <script>).
  const headStyles: string[] = [];
  const styleRe = /<style[^>]*>[\s\S]*?<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(headInner))) headStyles.push(m[0]);

  // Final assembly: styles first, then body content. Trim whitespace.
  const out = [headStyles.join('\n'), bodyInner.trim()].filter(Boolean).join('\n\n');
  return out.trim();
}

export function splitCombinedSource(source: string): { html: string; css: string } {
  if (!source) return { html: '', css: '' };
  const cssChunks: string[] = [];
  const html = source.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (_m, body: string) => {
      if (body && body.trim()) cssChunks.push(body);
      return '';
    },
  ).trim();
  return { html, css: cssChunks.join('\n\n') };
}

export function normalizePreset(raw: Record<string, unknown>, idFallback: string): BannerPreset {
  const scope: PresetScope = raw.scope === 'global' ? 'global' : 'store';
  const mode: PresetMode =
    raw.mode === 'html' ? 'html' :
    raw.mode === 'combined' ? 'combined' :
    'structured';
  const structuredRaw = (raw.structured || {}) as Partial<BannerPresetStructured>;
  const htmlRaw = (raw.html_content || {}) as Partial<BannerPresetHtml>;
  const combinedRaw = (raw.combined_content || {}) as Partial<BannerPresetCombined>;
  return {
    id: (raw.id as string) || idFallback,
    name: (raw.name as string) || '(untitled)',
    scope,
    owner_store_id: (raw.owner_store_id as string) || '',
    mode,
    preview_image_url: (raw.preview_image_url as string) || '',
    structured: {
      ...emptyStructured(),
      ...structuredRaw,
      original_price: Number(structuredRaw.original_price) || 0,
      discount_rate: Number(structuredRaw.discount_rate) || 0,
    },
    html_content: { ...emptyHtml(), ...htmlRaw },
    combined_content: { ...emptyCombined(), ...combinedRaw },
    is_template: raw.is_template === true,
    fields: Array.isArray(raw.fields)
      ? (raw.fields as TemplateField[]).map(f => ({
          key: String(f.key || ''),
          label: String(f.label || f.key || ''),
          type: (f.type as TemplateFieldType) || 'text',
          default: f.default ?? '',
          placeholder: f.placeholder,
          options: Array.isArray(f.options) ? f.options : undefined,
          min: typeof f.min === 'number' ? f.min : undefined,
          max: typeof f.max === 'number' ? f.max : undefined,
          unit: f.unit,
          editable: f.editable !== false,
          origin: f.origin,
        })).filter(f => f.key)
      : [],
    created_at: (raw.created_at as string) || '',
    updated_at: (raw.updated_at as string) || '',
    created_by: (raw.created_by as string) || '',
  };
}

export function canSeePreset(user: VisibilityUser, preset: BannerPreset): boolean {
  if (user.role === 'super_admin') return true;
  if (preset.scope === 'global') return true;
  return user.managed_stores.includes(preset.owner_store_id);
}

export function canWritePreset(user: VisibilityUser, preset: Pick<BannerPreset, 'scope' | 'owner_store_id'>): boolean {
  if (user.role === 'super_admin') return true;
  if (preset.scope !== 'store') return false;
  return user.managed_stores.includes(preset.owner_store_id);
}

/**
 * Convert a preset into a new banner config (snapshot semantics). The returned
 * shape matches the `Banner` interface in block-types.ts — caller provides the
 * banner's unique id.
 */
export function presetToBanner(preset: BannerPreset, bannerId: string): {
  id: string;
  template_id: string;
  custom_css: string;
  title: string;
  subtitle: string;
  image_url: string;
  original_price: number;
  discount_rate: number;
  link_url: string;
  visible: boolean;
  mode?: PresetMode;
  html?: string;
  html_css?: string;
} {
  if (preset.mode === 'html') {
    return {
      id: bannerId,
      template_id: preset.id,
      custom_css: '',
      title: preset.name,
      subtitle: '',
      image_url: '',
      original_price: 0,
      discount_rate: 0,
      link_url: '',
      visible: true,
      mode: 'html',
      html: preset.html_content.html,
      html_css: preset.html_content.css,
    };
  }
  if (preset.mode === 'combined') {
    const { html, css } = splitCombinedSource(preset.combined_content.source || '');
    return {
      id: bannerId,
      template_id: preset.id,
      custom_css: '',
      title: preset.name,
      subtitle: '',
      image_url: '',
      original_price: 0,
      discount_rate: 0,
      link_url: '',
      visible: true,
      mode: 'html',
      html,
      html_css: css,
    };
  }
  const s = preset.structured;
  return {
    id: bannerId,
    template_id: preset.id,
    custom_css: s.custom_css,
    title: s.title,
    subtitle: s.subtitle,
    image_url: s.image_url,
    original_price: s.original_price,
    discount_rate: s.discount_rate,
    link_url: s.link_url,
    visible: true,
    mode: 'structured',
  };
}
