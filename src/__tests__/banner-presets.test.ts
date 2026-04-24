import { describe, it, expect } from 'vitest';
import { canSeePreset, canWritePreset, presetToBanner, normalizePreset, splitCombinedSource, normalizeUploadedHtml, type BannerPreset, type VisibilityUser } from '../lib/banner-presets-shared';

type SessionUser = VisibilityUser & { uid: string; email: string };

function u(role: 'super_admin' | 'store_admin', managed: string[] = []): SessionUser {
  return { uid: 'u', email: 'a@b.c', role, managed_stores: managed };
}

function makePreset(partial: Partial<BannerPreset> = {}): BannerPreset {
  return normalizePreset({
    id: 'p1',
    name: 'Spring',
    scope: 'global',
    mode: 'structured',
    structured: { title: 'T', subtitle: '', image_url: '', original_price: 0, discount_rate: 0, link_url: '', custom_css: '' },
    html_content: { html: '', css: '' },
    ...partial,
  }, 'p1');
}

describe('canSeePreset', () => {
  it('super_admin sees everything', () => {
    expect(canSeePreset(u('super_admin'), makePreset({ scope: 'store', owner_store_id: 'x' }))).toBe(true);
  });
  it('store_admin sees globals', () => {
    expect(canSeePreset(u('store_admin', ['s1']), makePreset({ scope: 'global' }))).toBe(true);
  });
  it('store_admin sees presets owned by their store', () => {
    expect(canSeePreset(u('store_admin', ['s1']), makePreset({ scope: 'store', owner_store_id: 's1' }))).toBe(true);
  });
  it('store_admin does NOT see other stores’ presets', () => {
    expect(canSeePreset(u('store_admin', ['s1']), makePreset({ scope: 'store', owner_store_id: 's2' }))).toBe(false);
  });
});

describe('canWritePreset', () => {
  it('super_admin can write any', () => {
    expect(canWritePreset(u('super_admin'), { scope: 'global', owner_store_id: '' })).toBe(true);
    expect(canWritePreset(u('super_admin'), { scope: 'store', owner_store_id: 'x' })).toBe(true);
  });
  it('store_admin can write store-scoped in their stores only', () => {
    expect(canWritePreset(u('store_admin', ['s1']), { scope: 'store', owner_store_id: 's1' })).toBe(true);
    expect(canWritePreset(u('store_admin', ['s1']), { scope: 'store', owner_store_id: 's2' })).toBe(false);
  });
  it('store_admin cannot write globals', () => {
    expect(canWritePreset(u('store_admin', ['s1']), { scope: 'global', owner_store_id: '' })).toBe(false);
  });
});

describe('normalizeUploadedHtml', () => {
  it('extracts body + head styles from a full document', () => {
    const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ignore me</title>
  <style>.a { color: red }</style>
  <script>alert('nope')</script>
  <link rel="stylesheet" href="x.css">
</head>
<body>
  <div class="a">hello</div>
</body>
</html>`;
    const out = normalizeUploadedHtml(doc);
    expect(out).toContain('<style>.a { color: red }</style>');
    expect(out).toContain('<div class="a">hello</div>');
    expect(out).not.toContain('<title>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<link');
    expect(out).not.toContain('<!DOCTYPE');
  });

  it('returns a fragment untouched (modulo wrapping strip)', () => {
    const frag = '<div>hi</div>';
    expect(normalizeUploadedHtml(frag)).toBe('<div>hi</div>');
  });

  it('handles empty input', () => {
    expect(normalizeUploadedHtml('')).toBe('');
  });
});

describe('splitCombinedSource', () => {
  it('extracts all <style> blocks and joins CSS', () => {
    const s = '<style>.a{color:red}</style><div>hi</div><style>.b{}</style>';
    const out = splitCombinedSource(s);
    expect(out.html).toBe('<div>hi</div>');
    expect(out.css).toContain('.a{color:red}');
    expect(out.css).toContain('.b{}');
  });
  it('handles sources without styles', () => {
    expect(splitCombinedSource('<p>hi</p>')).toEqual({ html: '<p>hi</p>', css: '' });
  });
  it('handles empty input', () => {
    expect(splitCombinedSource('')).toEqual({ html: '', css: '' });
  });
  it('strips style tags but preserves body content', () => {
    const s = '<div>A</div><style>x</style>\n<div>B</div>';
    const out = splitCombinedSource(s);
    expect(out.html).toContain('<div>A</div>');
    expect(out.html).toContain('<div>B</div>');
    expect(out.html).not.toContain('<style>');
  });
});

describe('presetToBanner', () => {
  it('maps a structured preset into a Banner snapshot', () => {
    const p = makePreset({
      scope: 'global',
      structured: {
        title: 'T', subtitle: 'S', image_url: 'img', original_price: 1000, discount_rate: 10, link_url: '/x', custom_css: '.a{}',
      },
    });
    const b = presetToBanner(p, 'new-id');
    expect(b.id).toBe('new-id');
    expect(b.template_id).toBe(p.id);
    expect(b.title).toBe('T');
    expect(b.custom_css).toBe('.a{}');
    expect(b.visible).toBe(true);
    expect(b.mode).toBe('structured');
  });
  it('maps a combined preset: extracts <style> to html_css, html retains markup', () => {
    const p = makePreset({
      mode: 'combined',
      combined_content: {
        source: '<style>.x { color: red }</style><div class="x">x</div><style>.y{}</style>',
      },
    });
    const b = presetToBanner(p, 'nid');
    expect(b.mode).toBe('html');
    expect(b.html).toBe('<div class="x">x</div>');
    expect(b.html_css).toContain('.x { color: red }');
    expect(b.html_css).toContain('.y{}');
  });
  it('maps an html preset into an html-mode banner', () => {
    const p = makePreset({
      mode: 'html',
      html_content: { html: '<div>x</div>', css: '.x{}' },
    });
    const b = presetToBanner(p, 'nid');
    expect(b.mode).toBe('html');
    expect(b.html).toBe('<div>x</div>');
    expect(b.html_css).toBe('.x{}');
    expect(b.title).toBe(p.name);
  });
});
