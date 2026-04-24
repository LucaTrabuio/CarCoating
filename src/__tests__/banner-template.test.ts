import { describe, it, expect } from 'vitest';
import {
  extractTokens,
  inferFieldType,
  buildFieldSchemaFromTokens,
  pruneFieldsToExtracted,
  substitute,
  humanizeLabel,
  splitNumericDefault,
  autoTokenizeTextNodes,
} from '../lib/banner-template';

describe('extractTokens', () => {
  it('extracts text tokens and dedupes', () => {
    const out = extractTokens('<h1>{{title}}</h1><p>{{body}}</p><span>{{title}}</span>', '');
    expect(out.text.sort()).toEqual(['body', 'title']);
    expect(out.vars).toEqual([]);
  });

  it('extracts var tokens with defaults', () => {
    const out = extractTokens('', '.a { background: var(--bg, #0C3290); color: var(--fg); }');
    expect(out.vars).toEqual([
      { name: 'bg', default: '#0C3290' },
      { name: 'fg', default: undefined },
    ]);
  });

  it('extracts vars from HTML <style> blocks too', () => {
    const out = extractTokens(
      '<style>.a { background: var(--ink, black); }</style><div>{{x}}</div>',
      '',
    );
    expect(out.text).toEqual(['x']);
    expect(out.vars).toEqual([{ name: 'ink', default: 'black' }]);
  });

  it('tolerates empty input', () => {
    expect(extractTokens('', '')).toEqual({ text: [], vars: [] });
  });
});

describe('inferFieldType', () => {
  it('infers color from name', () => {
    expect(inferFieldType('bg_color', undefined, 'css')).toBe('color');
    expect(inferFieldType('border', undefined, 'css')).toBe('color');
  });
  it('infers number from size-like name', () => {
    expect(inferFieldType('padding', undefined, 'css')).toBe('number');
  });
  it('infers number from a value-with-unit default', () => {
    expect(inferFieldType('misc', '2rem', 'css')).toBe('number');
  });
  it('infers color from #hex default', () => {
    expect(inferFieldType('misc', '#fff', 'css')).toBe('color');
  });
  it('infers image from name', () => {
    expect(inferFieldType('hero_image', undefined, 'html')).toBe('image_url');
  });
  it('falls back to text', () => {
    expect(inferFieldType('headline', undefined, 'html')).toBe('text');
  });
  it('infers font select from "font" in css', () => {
    expect(inferFieldType('font', 'sans-serif', 'css')).toBe('select');
  });
  it('infers textarea from content-like name', () => {
    expect(inferFieldType('body_text', undefined, 'html')).toBe('textarea');
  });
});

describe('splitNumericDefault', () => {
  it('splits value + unit', () => {
    expect(splitNumericDefault('2rem')).toEqual({ value: '2', unit: 'rem' });
    expect(splitNumericDefault('16px')).toEqual({ value: '16', unit: 'px' });
    expect(splitNumericDefault('100%')).toEqual({ value: '100', unit: '%' });
  });
  it('returns raw when unparseable', () => {
    expect(splitNumericDefault('auto')).toEqual({ value: 'auto', unit: '' });
  });
});

describe('buildFieldSchemaFromTokens', () => {
  it('creates fields for text tokens with text type', () => {
    const fields = buildFieldSchemaFromTokens({ text: ['headline'], vars: [] });
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ key: 'headline', type: 'text', origin: 'html' });
  });

  it('creates color/number fields for var tokens based on heuristics', () => {
    const fields = buildFieldSchemaFromTokens({
      text: [],
      vars: [
        { name: 'bg', default: '#fff' },
        { name: 'padding', default: '2rem' },
      ],
    });
    const bg = fields.find(f => f.key === 'bg')!;
    const pad = fields.find(f => f.key === 'padding')!;
    expect(bg.type).toBe('color');
    expect(bg.default).toBe('#fff');
    expect(pad.type).toBe('number');
    expect(pad.default).toBe('2');
    expect(pad.unit).toBe('rem');
  });

  it('preserves existing field overrides', () => {
    const existing = [
      { key: 'bg', label: 'Brand color', type: 'color' as const, default: '#f00', editable: true, origin: 'css' as const },
    ];
    const fields = buildFieldSchemaFromTokens({ text: [], vars: [{ name: 'bg', default: '#fff' }] }, existing);
    expect(fields[0].label).toBe('Brand color');
    expect(fields[0].default).toBe('#f00'); // existing wins
  });
});

describe('pruneFieldsToExtracted', () => {
  it('drops fields whose keys no longer appear', () => {
    const fields = [
      { key: 'a', label: 'A', type: 'text' as const, default: '' },
      { key: 'b', label: 'B', type: 'text' as const, default: '' },
    ];
    const pruned = pruneFieldsToExtracted({ text: ['a'], vars: [] }, fields);
    expect(pruned.map(f => f.key)).toEqual(['a']);
  });
});

describe('humanizeLabel', () => {
  it('converts snake and kebab to words', () => {
    expect(humanizeLabel('hero_title')).toBe('Hero title');
    expect(humanizeLabel('bg-color')).toBe('Bg color');
  });
});

describe('autoTokenizeTextNodes', () => {
  it('replaces visible text with {{key}} placeholders', () => {
    const src = '<h1 class="headline">Big Sale</h1><p class="subheadline">Save now</p>';
    const { html, fields } = autoTokenizeTextNodes(src);
    expect(html).toContain('{{headline}}');
    expect(html).toContain('{{subheadline}}');
    const headline = fields.find(f => f.key === 'headline')!;
    expect(headline.default).toBe('Big Sale');
    expect(headline.type).toBe('text');
  });

  it('deduplicates keys when same class repeats', () => {
    const src = '<span class="badge">A</span><span class="badge">B</span>';
    const { html, fields } = autoTokenizeTextNodes(src);
    const keys = fields.map(f => f.key);
    expect(keys).toEqual(['badge', 'badge_2']);
    expect(html).toContain('{{badge}}');
    expect(html).toContain('{{badge_2}}');
  });

  it('skips empty / whitespace / pure-symbol content', () => {
    const src = '<div class="x">★</div><div class="y">  </div><div class="z">!!!</div>';
    const { fields } = autoTokenizeTextNodes(src);
    expect(fields).toHaveLength(0);
  });

  it('does not touch <style> or <script> contents', () => {
    const src = '<style>.a { content: "ignore" }</style><h1 class="t">Real text</h1>';
    const { html, fields } = autoTokenizeTextNodes(src);
    expect(html).toContain('content: "ignore"');
    expect(fields.map(f => f.key)).toEqual(['t']);
  });

  it('does not re-tokenize already-tokenized strings', () => {
    const src = '<h1 class="x">{{already}}</h1><h2 class="y">Raw</h2>';
    const { fields } = autoTokenizeTextNodes(src);
    expect(fields.map(f => f.key)).toEqual(['y']);
  });

  it('falls back to text_N when element has no class', () => {
    const src = '<h1>Fallback</h1>';
    const { fields } = autoTokenizeTextNodes(src);
    expect(fields[0].key).toMatch(/^text_\d+$/);
  });

  it('uses textarea type for long text', () => {
    const long = 'a'.repeat(80);
    const src = `<p class="body">${long}</p>`;
    const { fields } = autoTokenizeTextNodes(src);
    expect(fields[0].type).toBe('textarea');
  });
});

describe('substitute', () => {
  it('replaces {{key}} with escaped value', () => {
    const out = substitute(
      '<h1>{{title}}</h1>',
      '',
      [{ key: 'title', label: 'Title', type: 'text', default: 'D' }],
      { title: '<img>' },
    );
    expect(out.html).toBe('<h1>&lt;img&gt;</h1>');
  });

  it('falls back to default when value is empty or missing', () => {
    const fields = [{ key: 'a', label: 'A', type: 'text' as const, default: 'DEF' }];
    expect(substitute('{{a}}', '', fields, {}).html).toBe('DEF');
    expect(substitute('{{a}}', '', fields, { a: '' }).html).toBe('DEF');
  });

  it('replaces var(--key, default) with the raw value + unit when numeric', () => {
    const out = substitute(
      '',
      '.x { padding: var(--p, 1rem); }',
      [{ key: 'p', label: 'P', type: 'number', default: '2', unit: 'rem' }],
      { p: '3' },
    );
    expect(out.css).toBe('.x { padding: 3rem; }');
  });

  it('wraps image_url values in url(...) for CSS', () => {
    const out = substitute(
      '',
      '.x { background: var(--photo); }',
      [{ key: 'photo', label: 'Photo', type: 'image_url', default: '' }],
      { photo: '/img.png' },
    );
    expect(out.css).toBe('.x { background: url("/img.png"); }');
  });
});
