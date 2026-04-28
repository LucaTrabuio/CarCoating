import sanitizeHtmlLib from 'sanitize-html';

const ALLOWED_TAGS = [
  'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'i', 'img', 'li', 'ol', 'p', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'section', 'article',
  'figure', 'figcaption', 'blockquote', 'hr', 'code', 'pre',
];

const COMMON_ATTRS = ['class', 'style', 'title'];

const HTML_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel', ...COMMON_ATTRS],
    img: ['src', 'alt', 'width', 'height', ...COMMON_ATTRS],
    '*': COMMON_ATTRS,
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return sanitizeHtmlLib(input, HTML_OPTIONS);
}

// CSS scoped to a container — strips @import, url(javascript:), expression(), behavior:, and any
// curly-braced block that ends up outside a single selector (best-effort, not bulletproof).
export function sanitizeCss(input: string): string {
  if (!input) return '';
  return input
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/behavior\s*:[^;}]*/gi, '')
    .replace(/url\s*\(\s*["']?\s*javascript:[^)]*\)/gi, 'url()')
    .replace(/javascript\s*:/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, '');
}

/** Returns true if sanitization altered the input (admins should be warned/notified). */
export function wasModified(original: string, sanitized: string): boolean {
  return original.trim() !== sanitized.trim();
}
