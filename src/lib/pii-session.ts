import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminDb } from './firebase-admin';

const COOKIE_NAME = '__pii_session';
const IDLE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SEPARATOR = '.';

function getSecret(): Buffer {
  const secret = process.env.PII_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PII_SESSION_SECRET is not set');
    }
    return Buffer.from('dev-pii-session-secret-not-for-production-use-32b', 'utf8');
  }
  return Buffer.from(secret, 'utf8');
}

interface PiiPayload {
  uid: string;
  lastUsedAt: number;
}

function sign(payload: PiiPayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data, 'utf8').toString('base64url');
  const mac = createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}${SEPARATOR}${mac}`;
}

export function verifyPiiToken(token: string): PiiPayload | null {
  const idx = token.lastIndexOf(SEPARATOR);
  if (idx < 0) return null;

  const encoded = token.slice(0, idx);
  const mac = token.slice(idx + 1);

  const expected = createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(mac, 'base64url'), Buffer.from(expected, 'base64url'))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PiiPayload;
    if (Date.now() - payload.lastUsedAt > IDLE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function mintPiiCookie(uid: string): { value: string; options: object } {
  const payload: PiiPayload = { uid, lastUsedAt: Date.now() };
  const value = sign(payload);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    value,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: Math.floor(IDLE_TTL_MS / 1000),
    },
  };
}

export async function requirePiiAccess(
  request: Request,
  uid: string,
  auditMeta?: { storeId: string; action: string; adminEmail?: string; email?: string; ip?: string },
): Promise<{ ok: true; refreshedCookie: { value: string; options: object } } | { ok: false; response: NextResponse }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));

  const tokenValue = match ? match.slice(COOKIE_NAME.length + 1) : undefined;

  if (!tokenValue) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'PII step-up required' }, { status: 403 }),
    };
  }

  const payload = verifyPiiToken(tokenValue);
  if (!payload || payload.uid !== uid) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'PII step-up required' }, { status: 403 }),
    };
  }

  if (auditMeta) {
    try {
      const db = getAdminDb();
      await db.collection('piiAccessLog').add({
        adminUid: uid,
        adminEmail: auditMeta.adminEmail || null,
        storeId: auditMeta.storeId,
        action: auditMeta.action,
        customerEmail: auditMeta.email || null,
        at: new Date().toISOString(),
        ip: auditMeta.ip || null,
      });
    } catch {
      // audit log is best-effort
    }
  }

  const refreshed = mintPiiCookie(uid);
  return { ok: true, refreshedCookie: refreshed };
}

export async function requirePiiAccessFromCookieStore(
  uid: string,
  auditMeta?: { storeId: string; action: string; adminEmail?: string; email?: string; ip?: string },
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const cookieStore = await cookies();
  const tokenValue = cookieStore.get(COOKIE_NAME)?.value;

  if (!tokenValue) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'PII step-up required' }, { status: 403 }),
    };
  }

  const payload = verifyPiiToken(tokenValue);
  if (!payload || payload.uid !== uid) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'PII step-up required' }, { status: 403 }),
    };
  }

  if (auditMeta) {
    try {
      const db = getAdminDb();
      await db.collection('piiAccessLog').add({
        adminUid: uid,
        adminEmail: auditMeta.adminEmail || null,
        storeId: auditMeta.storeId,
        action: auditMeta.action,
        customerEmail: auditMeta.email || null,
        at: new Date().toISOString(),
        ip: auditMeta.ip || null,
      });
    } catch {
      // best-effort
    }
  }

  const refreshed = mintPiiCookie(uid);
  cookieStore.set(COOKIE_NAME, refreshed.value, refreshed.options as Parameters<typeof cookieStore.set>[2]);

  return { ok: true };
}

export { COOKIE_NAME as PII_COOKIE_NAME };
