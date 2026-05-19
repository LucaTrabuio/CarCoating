// Edge-compatible HMAC for __admin_active cookie (Layer 2 idle gate).
// Uses Web Crypto only — do NOT import firebase-admin or node:crypto here.

export const ADMIN_ACTIVE_COOKIE = '__admin_active';
const IDLE_TTL_MS = 60 * 60 * 1000; // 1 hour
const SEPARATOR = '.';

export interface AdminActivePayload {
  uid: string;
  email: string;
  role: string;
  passwordChangedAt: string | null;
  mustChangePassword: boolean;
  lastActiveAt: number;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_ACTIVE_SECRET;
  let keyMaterial: BufferSource;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_ACTIVE_SECRET is not set');
    }
    keyMaterial = new TextEncoder().encode('dev-admin-active-secret-not-for-production-use');
  } else {
    keyMaterial = new TextEncoder().encode(secret);
  }

  return crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function bufferToBase64url(buf: BufferSource): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return view;
}

export async function mintAdminActive(payload: Omit<AdminActivePayload, 'lastActiveAt'>, opts?: { now?: number }): Promise<{ value: string; options: object }> {
  const lastActiveAt = opts?.now ?? Date.now();
  const data = JSON.stringify({ ...payload, lastActiveAt });
  const encoded = bufferToBase64url(new TextEncoder().encode(data));
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  const mac = bufferToBase64url(sig);
  const value = `${encoded}${SEPARATOR}${mac}`;
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    value,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(IDLE_TTL_MS / 1000),
    },
  };
}

export async function verifyAdminActive(token: string): Promise<AdminActivePayload | null> {
  const idx = token.lastIndexOf(SEPARATOR);
  if (idx < 0) return null;

  const encoded = token.slice(0, idx);
  const mac = token.slice(idx + 1);

  try {
    const key = await getKey();
    const macBytes = base64urlToBuffer(mac);
    const valid = await crypto.subtle.verify('HMAC', key, macBytes, new TextEncoder().encode(encoded));
    if (!valid) return null;

    const data = new TextDecoder().decode(base64urlToBuffer(encoded));
    const payload = JSON.parse(data) as AdminActivePayload;

    if (Date.now() - payload.lastActiveAt > IDLE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
