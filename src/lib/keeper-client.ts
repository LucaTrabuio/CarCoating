// Keeper (Meets-SPI) External API client — server-side only.
// Auth implementation ports the §6.1 Node.js reference verbatim.
// NEVER import this file from client components.

import { createHash, createHmac } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type {
  Survey,
  SurveyListResponse,
  SurveyResponse,
  ResponseListPage,
  KeeperApiError,
  KeeperErrorCode,
} from './keeper-types';

// ─── Constants ────────────────────────────────────────────────

export const EMPTY_BODY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// ─── Helpers ──────────────────────────────────────────────────

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Lazy env-var accessor — crashes server-side with a clear message if missing. */
function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`[keeper-client] Required env var ${name} is not set`);
  }
  return val;
}

function getBaseUrl(): string {
  return (
    process.env.KEEPER_API_BASE_URL ??
    'https://asia-northeast1-talent-insight-8b2b9.cloudfunctions.net/externalApiV1'
  );
}

// ─── Pure canonical-string functions (exported for unit tests) ─

/**
 * Build the canonical query string from a URLSearchParams object.
 * Keys + values are RFC 3986 percent-encoded; entries are sorted ascending by key.
 */
export function canonicalQuery(params: URLSearchParams): string {
  const entries = [...params.entries()];
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * Build the 7-line canonical request string (pure — no side effects).
 * The caller is responsible for supplying timestamp and nonce.
 */
export function buildCanonicalString(opts: {
  method: string;
  path: string;
  query: URLSearchParams;
  keyId: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}): string {
  return [
    opts.method.toUpperCase(),
    opts.path,
    canonicalQuery(opts.query),
    opts.keyId,
    opts.timestamp,
    opts.nonce,
    opts.bodyHash,
  ].join('\n');
}

// ─── signRequest ─────────────────────────────────────────────

/**
 * Generate the four HMAC auth headers for one request.
 * Reads KEY_ID and SECRET from env lazily (no crash on module import).
 * SECRET is .trimEnd()-ed to handle stray trailing newlines in .env files.
 */
export function signRequest(
  method: string,
  path: string,
  query: URLSearchParams,
  body = '',
): Record<string, string> {
  const keyId = getEnv('KEEPER_API_KEY_ID');
  const secret = getEnv('KEEPER_API_SECRET').trimEnd();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const bodyHash = body ? sha256Hex(body) : EMPTY_BODY_SHA256;

  const canonical = buildCanonicalString({
    method,
    path,
    query,
    keyId,
    timestamp,
    nonce,
    bodyHash,
  });

  const signature = createHmac('sha256', secret)
    .update(canonical)
    .digest('hex');

  return {
    'X-MeetsSPI-Key-Id': keyId,
    'X-MeetsSPI-Timestamp': timestamp,
    'X-MeetsSPI-Nonce': nonce,
    'X-MeetsSPI-Signature': `algorithm=HMAC-SHA256, signature=${signature}`,
  };
}

// ─── Error type constructor ───────────────────────────────────

function makeKeeperError(
  message: string,
  status: number,
  code: KeeperErrorCode | string,
  requestId: string | null,
  hint: string | null = null,
): KeeperApiError {
  const err = new Error(message) as KeeperApiError;
  err.code = code;
  err.status = status;
  err.requestId = requestId;
  err.hint = hint;
  return err;
}

/**
 * Extract the compact server diagnostic tag from a 503 error message of the
 * form `... hint=<tag>` (e.g. `hint=missing_role_token_creator`). Returns the
 * tag or null. Pure — exported for unit testing.
 */
export function extractHint(message: string | undefined | null): string | null {
  if (!message) return null;
  const m = message.match(/hint=([A-Za-z0-9_.-]+)/);
  return m ? m[1] : null;
}

// ─── keeperFetch ─────────────────────────────────────────────

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 60_000;

/**
 * Fetch a Keeper API endpoint with HMAC signing + exponential backoff.
 * Uses the SAME URLSearchParams object for both the canonical builder and the URL.
 * NEVER logs answers, respondent_token, or the SECRET.
 */
export async function keeperFetch(
  method: string,
  path: string,
  query: URLSearchParams = new URLSearchParams(),
  maxRetries = 3,
): Promise<unknown> {
  const base = getBaseUrl();
  const qs = query.toString();
  const url = qs ? `${base}${path}?${qs}` : `${base}${path}`;

  let lastError: KeeperApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, attempt - 1),
        BACKOFF_CAP_MS,
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    const headers = signRequest(method, path, query);
    let res: Response;
    try {
      res = await fetch(url, { method, headers });
    } catch (networkErr) {
      lastError = makeKeeperError(
        `Network error: ${String(networkErr)}`,
        0,
        'internal_error',
        null,
      );
      continue;
    }

    const requestId = res.headers.get('x-request-id');

    if (res.ok) {
      return res.json();
    }

    // Parse error body if possible. 503 file/CSV signing failures carry a
    // `hint=<tag>` diagnostic in the message and/or the sign-fallback header.
    let code: string = 'internal_error';
    let hint: string | null = res.headers.get('x-meetsspi-sign-fallback');
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body?.error?.code ?? code;
      hint = extractHint(body?.error?.message) ?? hint;
    } catch {
      // ignore parse failure
    }

    lastError = makeKeeperError(
      `Keeper API error ${res.status} (${code})${hint ? ` [hint=${hint}]` : ''}`,
      res.status,
      code as KeeperErrorCode,
      requestId,
      hint,
    );

    // Don't retry on 4xx (except possibly transient auth issues — but the
    // spec says there's no 429 in Phase 1, and 401/403 won't fix on retry).
    if (res.status >= 400 && res.status < 500) {
      break;
    }
  }

  throw lastError ?? makeKeeperError('Unknown error', 0, 'internal_error', null);
}

// ─── Typed callers ────────────────────────────────────────────

export async function listSurveys(opts: {
  updatedSince?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<SurveyListResponse> {
  const query = new URLSearchParams();
  if (opts.limit != null) query.set('limit', String(opts.limit));
  if (opts.cursor) query.set('cursor', opts.cursor);
  if (opts.updatedSince) query.set('updated_since', opts.updatedSince);
  return keeperFetch('GET', '/v1/surveys', query) as Promise<SurveyListResponse>;
}

export async function getSurvey(surveyId: string): Promise<Survey> {
  return keeperFetch(
    'GET',
    `/v1/surveys/${encodeURIComponent(surveyId)}`,
    new URLSearchParams(),
  ) as Promise<Survey>;
}

export async function listResponses(
  surveyId: string,
  opts: {
    submittedSince?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<ResponseListPage> {
  const query = new URLSearchParams();
  if (opts.limit != null) query.set('limit', String(opts.limit));
  if (opts.cursor) query.set('cursor', opts.cursor);
  if (opts.submittedSince) query.set('submitted_since', opts.submittedSince);
  return keeperFetch(
    'GET',
    `/v1/surveys/${encodeURIComponent(surveyId)}/responses`,
    query,
  ) as Promise<ResponseListPage>;
}

/**
 * Fetch a file binary from Keeper:
 * 1. HMAC-signed request with redirect:'manual' to intercept the 302.
 * 2. Follow the Location URL WITHOUT Keeper headers (don't leak HMAC to Google Storage).
 * Returns { buffer, contentType }.
 */
export async function fetchFileBinary(
  surveyId: string,
  fileId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const path = `/v1/surveys/${encodeURIComponent(surveyId)}/files/${encodeURIComponent(fileId)}`;
  const query = new URLSearchParams();
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const headers = signRequest('GET', path, query);

  const res = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });

  if (res.status !== 302) {
    const requestId = res.headers.get('x-request-id');
    // A 503 here is typically a Storage/IAM signing failure; capture the
    // hint tag (message `hint=<tag>` or the sign-fallback header) so the
    // system alert is self-diagnosing.
    let code: string = 'internal_error';
    let hint: string | null = res.headers.get('x-meetsspi-sign-fallback');
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body?.error?.code ?? code;
      hint = extractHint(body?.error?.message) ?? hint;
    } catch {
      // ignore parse failure
    }
    throw makeKeeperError(
      `Expected 302 from file endpoint, got ${res.status} (${code})${hint ? ` [hint=${hint}]` : ''}`,
      res.status,
      code as KeeperErrorCode,
      requestId,
      hint,
    );
  }

  const location = res.headers.get('location');
  if (!location) {
    throw makeKeeperError(
      'File endpoint returned 302 without Location header',
      302,
      'internal_error',
      null,
    );
  }

  // Fetch from the signed Storage URL WITHOUT any Keeper headers.
  const storageRes = await fetch(location);
  if (!storageRes.ok) {
    throw makeKeeperError(
      `Storage fetch failed: ${storageRes.status}`,
      storageRes.status,
      'internal_error',
      null,
    );
  }

  const arrayBuffer = await storageRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType =
    storageRes.headers.get('content-type') ?? 'application/octet-stream';

  return { buffer, contentType };
}

// Re-export response type so callers don't need to import from keeper-types
export type { SurveyResponse, Survey, ResponseListPage, SurveyListResponse };
