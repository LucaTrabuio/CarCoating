/**
 * Pure helpers for parameterized banner templates.
 *
 * Tokens:
 *   - `{{name}}` in HTML — becomes a text field at placement time
 *   - `var(--name, default)` in CSS — becomes a typed style field
 *
 * All functions here are pure and safe to import from client or server code.
 */

import type { TemplateField, TemplateFieldType } from './banner-presets-shared';

// ─── Regexes (reused, so compile once) ─────────────────────

const TEXT_TOKEN_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}\}/g;
const CSS_VAR_RE = /var\(\s*--([a-zA-Z_][a-zA-Z0-9_-]*)\s*(?:,\s*([^)]+?)\s*)?\)/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Extraction ────────────────────────────────────────────

export interface ExtractedTokens {
  text: string[];
  vars: Array<{ name: string; default?: string }>;
}

export function extractTokens(html: string, css: string): ExtractedTokens {
  const textSet = new Set<string>();
  let m: RegExpExecArray | null;
  TEXT_TOKEN_RE.lastIndex = 0;
  while ((m = TEXT_TOKEN_RE.exec(html || ''))) textSet.add(m[1]);

  // CSS might also be inside a <style> block in the HTML (combined mode source).
  // Scan both for var() tokens; dedupe.
  const varMap = new Map<string, string | undefined>();
  CSS_VAR_RE.lastIndex = 0;
  while ((m = CSS_VAR_RE.exec(css || ''))) {
    if (!varMap.has(m[1])) varMap.set(m[1], m[2]?.trim());
  }
  CSS_VAR_RE.lastIndex = 0;
  while ((m = CSS_VAR_RE.exec(html || ''))) {
    if (!varMap.has(m[1])) varMap.set(m[1], m[2]?.trim());
  }

  return {
    text: [...textSet],
    vars: [...varMap].map(([name, def]) => ({ name, default: def })),
  };
}

// ─── Type inference ────────────────────────────────────────

const COLOR_HINT_RE = /(color|bg|background|fg|foreground|border|shadow|tint|accent)/i;
const SIZE_HINT_RE = /(size|width|height|padding|margin|radius|gap|spacing|tracking|leading)/i;
const IMAGE_HINT_RE = /(image|img|photo|src|icon|avatar|logo)/i;
const URL_HINT_RE = /(link|href|url)/i;
const FONT_HINT_RE = /font/i;
const MULTILINE_HINT_RE = /(body|description|desc|content|text_long)/i;

const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const CSS_FUNC_COLOR_RE = /^(rgb|rgba|hsl|hsla)\s*\(/i;
const NAMED_COLOR_RE = /^(transparent|currentColor|inherit|initial|unset|revert)$/i;
const NUMBER_WITH_UNIT_RE = /^(-?\d+(?:\.\d+)?)(px|rem|em|%|vw|vh|ch|ex|pt|pc|mm|cm|in)?$/;

export function inferFieldType(name: string, defaultValue: string | undefined, origin: 'html' | 'css'): TemplateFieldType {
  const n = name || '';
  const d = (defaultValue || '').trim();

  // Name-based hints first (explicit intent beats guessing from values).
  if (origin === 'css' && FONT_HINT_RE.test(n)) return 'select';
  if (COLOR_HINT_RE.test(n)) return 'color';
  if (SIZE_HINT_RE.test(n)) return 'number';
  if (IMAGE_HINT_RE.test(n)) return 'image_url';
  if (URL_HINT_RE.test(n)) return 'url';
  if (MULTILINE_HINT_RE.test(n)) return 'textarea';

  // Value-based hints.
  if (d) {
    if (HEX_COLOR_RE.test(d) || CSS_FUNC_COLOR_RE.test(d) || NAMED_COLOR_RE.test(d)) return 'color';
    if (NUMBER_WITH_UNIT_RE.test(d)) return 'number';
    if (/^https?:\/\//i.test(d)) return 'url';
  }

  return 'text';
}

/** Split a CSS numeric default into (number, unit). */
export function splitNumericDefault(value: string): { value: string; unit: string } {
  const m = NUMBER_WITH_UNIT_RE.exec(value.trim());
  if (!m) return { value: value.trim(), unit: '' };
  return { value: m[1], unit: m[2] || '' };
}

// ─── Schema building ───────────────────────────────────────

export function buildFieldSchemaFromTokens(
  extracted: ExtractedTokens,
  existing: TemplateField[] = [],
): TemplateField[] {
  const byKey = new Map<string, TemplateField>();
  for (const f of existing) byKey.set(f.key, f);

  // Text tokens
  for (const key of extracted.text) {
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        label: humanizeLabel(key),
        type: inferFieldType(key, undefined, 'html'),
        default: '',
        editable: true,
        origin: 'html',
      });
    }
  }

  // Var tokens
  for (const { name: key, default: def } of extracted.vars) {
    if (byKey.has(key)) {
      const existingField = byKey.get(key)!;
      if (!existingField.default && def) {
        byKey.set(key, { ...existingField, default: def });
      }
      continue;
    }
    const type = inferFieldType(key, def, 'css');
    if (type === 'number' && def) {
      const { value, unit } = splitNumericDefault(def);
      byKey.set(key, {
        key,
        label: humanizeLabel(key),
        type,
        default: value,
        unit: unit || undefined,
        editable: true,
        origin: 'css',
      });
    } else {
      byKey.set(key, {
        key,
        label: humanizeLabel(key),
        type,
        default: def || '',
        editable: true,
        origin: 'css',
      });
    }
  }

  // Preserve author order: existing fields first (their ordering), then newly discovered tokens.
  const existingKeys = existing.map(f => f.key);
  const ordered: TemplateField[] = [];
  for (const k of existingKeys) {
    if (byKey.has(k)) ordered.push(byKey.get(k)!);
  }
  for (const [k, v] of byKey) {
    if (!existingKeys.includes(k)) ordered.push(v);
  }
  return ordered;
}

/** Remove fields whose keys no longer appear in any token of the current html/css. */
export function pruneFieldsToExtracted(
  extracted: ExtractedTokens,
  fields: TemplateField[],
): TemplateField[] {
  const known = new Set<string>([...extracted.text, ...extracted.vars.map(v => v.name)]);
  return fields.filter(f => known.has(f.key));
}

export function humanizeLabel(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

// ─── Substitution ──────────────────────────────────────────

export interface Substituted {
  html: string;
  css: string;
}

// ─── Auto-tokenization from static HTML ────────────────────

const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
const TEXTLESS_TAGS = new Set(['style', 'script', 'template', 'noscript']);

/**
 * Scan HTML and replace visible text content with `{{key}}` tokens, returning
 * a modified HTML string + a fields array populated with the original text as
 * each field's default. Keys are derived from the enclosing element's first
 * class name (e.g. `<h1 class="headline">Big Sale</h1>` → key `headline`).
 *
 * - Text inside `<style>`, `<script>`, `<template>`, `<noscript>` is skipped.
 * - Whitespace-only or single-character text (including pure emoji) is skipped.
 * - Already-tokenized text (`{{x}}`) is left alone.
 * - Existing field keys are deduplicated — the new keys get numeric suffixes.
 *
 * Pure function. Safe on server or client; no DOM APIs.
 */
export function autoTokenizeTextNodes(
  html: string,
  existingFields: TemplateField[] = [],
): { html: string; fields: TemplateField[] } {
  const fields = existingFields.map(f => ({ ...f }));
  const usedKeys = new Set(fields.map(f => f.key));
  const stack: Array<{ tag: string; classAttr: string }> = [];
  let result = '';
  let i = 0;
  let counter = 1;

  const src = html || '';

  while (i < src.length) {
    if (src[i] === '<') {
      // Comments pass through untouched.
      if (src.slice(i, i + 4) === '<!--') {
        const end = src.indexOf('-->', i + 4);
        if (end === -1) { result += src.slice(i); break; }
        result += src.slice(i, end + 3);
        i = end + 3;
        continue;
      }
      const endTag = src.indexOf('>', i);
      if (endTag === -1) { result += src.slice(i); break; }
      const inner = src.slice(i + 1, endTag);
      const isClosing = inner.startsWith('/');
      const isSelfClosing = inner.endsWith('/');
      const name = (isClosing ? inner.slice(1) : inner).split(/[\s/>]/)[0].toLowerCase();

      if (isClosing) {
        // Pop until matching tag.
        while (stack.length > 0 && stack[stack.length - 1].tag !== name) stack.pop();
        if (stack.length > 0) stack.pop();
      } else if (!isSelfClosing && !VOID_TAGS.has(name)) {
        const classMatch = inner.match(/class=["']([^"']+)["']/);
        stack.push({ tag: name, classAttr: classMatch ? classMatch[1] : '' });
      }
      result += src.slice(i, endTag + 1);
      i = endTag + 1;
      continue;
    }

    const nextLt = src.indexOf('<', i);
    const text = nextLt === -1 ? src.slice(i) : src.slice(i, nextLt);
    const trimmed = text.trim();
    const top = stack[stack.length - 1];
    const inTextlessContainer = top && TEXTLESS_TAGS.has(top.tag);

    const tokenizable =
      trimmed.length > 0
      && !inTextlessContainer
      && !/^\{\{[a-zA-Z_][a-zA-Z0-9_-]*\}\}$/.test(trimmed)
      // Must contain at least one letter or number (filters pure emoji/punctuation).
      && /[\p{L}\p{N}]/u.test(trimmed)
      && stack.length > 0;

    if (!tokenizable) {
      result += text;
    } else {
      const classes = top!.classAttr.split(/\s+/).filter(Boolean);
      let baseKey = classes[0]
        ? classes[0].replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').toLowerCase()
        : '';
      if (!baseKey || /^\d/.test(baseKey)) baseKey = `text_${counter}`;

      let uniqueKey = baseKey;
      let n = 2;
      while (usedKeys.has(uniqueKey)) uniqueKey = `${baseKey}_${n++}`;
      usedKeys.add(uniqueKey);
      counter++;

      fields.push({
        key: uniqueKey,
        label: trimmed.slice(0, 40),
        type: trimmed.length > 60 ? 'textarea' : 'text',
        default: trimmed,
        editable: true,
        origin: 'html',
      });

      const leading = text.match(/^\s*/)![0];
      const trailing = text.match(/\s*$/)![0];
      result += `${leading}{{${uniqueKey}}}${trailing}`;
    }

    i = nextLt === -1 ? src.length : nextLt;
  }

  return { html: result, fields };
}

/**
 * Inline-substitute `{{key}}` (HTML) and `var(--key, …)` (CSS) with the given
 * values. Text values are HTML-escaped. CSS values are inserted raw — the
 * caller is expected to run `sanitizeCss` afterwards as usual.
 *
 * If a value is missing, the field's `default` is used.
 */
export function substitute(
  html: string,
  css: string,
  fields: TemplateField[],
  values: Record<string, string>,
): Substituted {
  let outHtml = html || '';
  let outCss = css || '';

  for (const field of fields) {
    const raw = values[field.key];
    const effective = raw !== undefined && raw !== '' ? raw : field.default;

    // HTML: replace {{key}} with escaped value.
    outHtml = outHtml.replace(
      new RegExp(`\\{\\{\\s*${escapeRegex(field.key)}\\s*\\}\\}`, 'g'),
      escapeHtml(effective ?? ''),
    );

    // CSS var(): replace with raw value + optional unit. Special-case image_url
    // to wrap in url(...) so author can write `background: var(--photo)`.
    let cssReplacement = effective ?? '';
    if (field.type === 'image_url' && cssReplacement) {
      cssReplacement = `url("${cssReplacement.replace(/"/g, '\\"')}")`;
    } else if (field.type === 'number' && field.unit) {
      cssReplacement = `${cssReplacement}${field.unit}`;
    }
    outCss = outCss.replace(
      new RegExp(`var\\(\\s*--${escapeRegex(field.key)}\\s*(?:,[^)]*)?\\)`, 'g'),
      cssReplacement,
    );
  }

  return { html: outHtml, css: outCss };
}
