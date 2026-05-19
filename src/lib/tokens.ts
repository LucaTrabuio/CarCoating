import { randomBytes, createHash } from 'node:crypto';

/** Generate a cryptographically-random URL-safe token (hex string). */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/** SHA-256 hex hash of a token — used as Firestore doc ID. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
