import DOMPurify from 'isomorphic-dompurify';

const HTML_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'i', 'img', 'li', 'ol', 'p', 'small', 'span', 'strong', 'sub', 'sup',
    'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'section', 'article',
    'figure', 'figcaption', 'blockquote', 'hr', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'class', 'style', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, HTML_CONFIG);
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
