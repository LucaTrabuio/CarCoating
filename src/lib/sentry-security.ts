import * as Sentry from '@sentry/nextjs';

export type SecurityErrorType = 'WAF_BLOCKED' | 'VALIDATION_ERROR' | 'UNAUTHORIZED';

export function getRequestSecurityContext(
  request: Request,
): { method: string; path: string; ip: string } {
  const method = request.method;

  let path = '';
  try {
    path = new URL(request.url).pathname;
  } catch {
    path = '';
  }

  const headers = request.headers;
  let ip = 'unknown';
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) {
    ip = cfIp.trim();
  } else {
    const vercelFwd = headers.get('x-vercel-forwarded-for');
    if (vercelFwd) {
      ip = vercelFwd.split(',')[0].trim();
    } else {
      const xFwd = headers.get('x-forwarded-for');
      if (xFwd) {
        ip = xFwd.split(',')[0].trim();
      } else {
        const realIp = headers.get('x-real-ip');
        if (realIp) {
          ip = realIp.trim();
        }
      }
    }
  }

  return { method, path, ip };
}

export function captureSecurityEvent(opts: {
  request?: Request;
  type: SecurityErrorType;
  level?: Sentry.SeverityLevel;
  message: string;
  error?: unknown;
  extra?: Record<string, unknown>;
}): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag('security_event', 'true');
      scope.setTag('error_type', opts.type);

      if (opts.request) {
        const ctx = getRequestSecurityContext(opts.request);
        scope.setContext('request', ctx);
        scope.setTag('method', ctx.method);
        scope.setTag('path', ctx.path);
      }

      if (opts.extra) {
        scope.setExtras(opts.extra);
      }

      if (opts.error !== undefined) {
        Sentry.captureException(opts.error);
      } else {
        Sentry.captureMessage(opts.message, opts.level ?? 'warning');
      }
    });
  } catch {
    // swallow internal Sentry errors — never let monitoring break the request
  }
}

type SuspiciousRule = { name: string; pattern: RegExp };

const SUSPICIOUS_RULES: SuspiciousRule[] = [
  {
    name: 'sql_injection',
    pattern: /('|;|--|\b(?:union|select|insert|update|delete|drop|alter)\b\s|\bor\b\s+\d+\s*=\s*\d+)/i,
  },
  {
    name: 'xss',
    pattern: /<script\b|onerror\s*=|onload\s*=|javascript:|<img\b[^>]*onerror/i,
  },
  {
    name: 'path_traversal',
    pattern: /\.\.\//,
  },
];

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 10) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((v) => collectStrings(v, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((v) =>
      collectStrings(v, depth + 1),
    );
  }
  return [];
}

export function detectSuspiciousPatterns(value: unknown): string[] {
  const strings = collectStrings(value);
  const matched = new Set<string>();
  for (const str of strings) {
    for (const rule of SUSPICIOUS_RULES) {
      if (rule.pattern.test(str)) {
        matched.add(rule.name);
      }
    }
  }
  return Array.from(matched);
}
