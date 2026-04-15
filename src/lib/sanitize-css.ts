// CSS scoped to a container — strips @import, url(javascript:), expression(), behavior:, and any
// curly-braced block that ends up outside a single selector (best-effort, not bulletproof).
// Separated from sanitize.ts to avoid pulling in isomorphic-dompurify/jsdom on the server.
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
