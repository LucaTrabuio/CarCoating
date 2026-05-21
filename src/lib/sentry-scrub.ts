const DENYLIST_KEYS = [
  'password',
  'token',
  'idtoken',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
  'cookie',
  'session',
  'apikey',
  'api_key',
  'phone',
  'tel',
  'email',
  'license',
  'plate',
  'address',
  'card',
  'cvv',
  'creditcard',
  '__session',
  '__admin_active',
];

const REDACT_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  /(?:\+81|0)\d{1,4}[-(]?\d{1,4}[-)]?\d{3,4}/g,
  /\b(?:\d[ -]?){13,16}\b/g,
  /[一-龥]{1,4}\s?\d{1,3}\s?[぀-ゟ]\s?\d{1,4}/g,
];

// "name" is handled separately: a blanket substring match would also nuke
// non-PII structural/context keys (os.name, runtime.name, browser.name,
// storeName, locationName, filename, hostname, sdk.name) and strip useful
// Sentry diagnostics. Match only person-name-bearing keys; free-text customer
// names in string VALUES are still caught by the email/phone/plate regexes.
function isCustomerNameKey(normalized: string): boolean {
  // Only person-name keys; structural/context names (storeName, locationName,
  // filename, hostname, os/runtime/browser/sdk "name") deliberately do NOT match.
  return /^name$|^(?:customer|full|first|last|user|given|family)name$/.test(normalized);
}

function isDenylisted(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (isCustomerNameKey(normalized)) return true;
  return DENYLIST_KEYS.some((k) => normalized.includes(k.toLowerCase().replace(/[^a-z0-9_]/g, '')));
}

function redactString(value: string): string {
  let result = value;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function walkValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => walkValue(item));
  if (typeof value === 'object') return walkObject(value as Record<string, unknown>);
  return value;
}

function walkObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (isDenylisted(key)) {
      result[key] = '[Filtered]';
    } else {
      result[key] = walkValue(obj[key]);
    }
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubEvent<T extends Record<string, any>>(event: T): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrubbed: Record<string, any> = { ...event };

    // Strip user entirely
    delete scrubbed.user;

    // Strip request cookies and sensitive headers
    if (scrubbed.request && typeof scrubbed.request === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req: Record<string, any> = { ...scrubbed.request };
      delete req.cookies;
      if (req.headers && typeof req.headers === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const headers: Record<string, any> = { ...req.headers };
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === 'cookie' || k.toLowerCase() === 'authorization') {
            delete headers[k];
          }
        }
        req.headers = headers;
      }
      scrubbed.request = req;
    }

    // Walk extra
    if (scrubbed.extra && typeof scrubbed.extra === 'object') {
      scrubbed.extra = walkObject(scrubbed.extra as Record<string, unknown>);
    }

    // Walk contexts
    if (scrubbed.contexts && typeof scrubbed.contexts === 'object') {
      scrubbed.contexts = walkObject(scrubbed.contexts as Record<string, unknown>);
    }

    // Walk tags (values only — keys are fixed strings)
    if (scrubbed.tags && typeof scrubbed.tags === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tags: Record<string, any> = { ...scrubbed.tags };
      for (const k of Object.keys(tags)) {
        if (typeof tags[k] === 'string') {
          tags[k] = redactString(tags[k]);
        }
      }
      scrubbed.tags = tags;
    }

    // Walk breadcrumbs
    if (scrubbed.breadcrumbs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bc = scrubbed.breadcrumbs as any;
      if (Array.isArray(bc)) {
        scrubbed.breadcrumbs = bc.map((b: unknown) => walkValue(b));
      } else if (bc && typeof bc === 'object' && Array.isArray(bc.values)) {
        scrubbed.breadcrumbs = { ...bc, values: bc.values.map((b: unknown) => walkValue(b)) };
      }
    }

    // Walk exception values (message + value strings, plus the structured data)
    if (
      scrubbed.exception &&
      typeof scrubbed.exception === 'object' &&
      Array.isArray(scrubbed.exception.values)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scrubbed.exception = {
        ...scrubbed.exception,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        values: scrubbed.exception.values.map((v: any) => {
          if (!v || typeof v !== 'object') return v;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ev: Record<string, any> = { ...v };
          if (typeof ev.value === 'string') ev.value = redactString(ev.value);
          if (typeof ev.message === 'string') ev.message = redactString(ev.message);
          return ev;
        }),
      };
    }

    return scrubbed as T;
  } catch {
    return event;
  }
}
