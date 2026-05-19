import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mintAdminActive, verifyAdminActive } from '../lib/admin-active';

process.env.ADMIN_ACTIVE_SECRET = 'test-admin-active-secret-long-enough-for-hmac';

const basePayload = {
  uid: 'uid-123',
  email: 'admin@example.com',
  role: 'super_admin',
  passwordChangedAt: new Date().toISOString(),
  mustChangePassword: false,
};

describe('admin-active', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mint + verify roundtrip succeeds', async () => {
    const { value } = await mintAdminActive(basePayload);
    const payload = await verifyAdminActive(value);
    expect(payload).not.toBeNull();
    expect(payload!.uid).toBe('uid-123');
    expect(payload!.email).toBe('admin@example.com');
    expect(payload!.role).toBe('super_admin');
    expect(payload!.mustChangePassword).toBe(false);
  });

  it('tampered token fails', async () => {
    const { value } = await mintAdminActive(basePayload);
    const tampered = value.slice(0, -4) + 'xxxx';
    expect(await verifyAdminActive(tampered)).toBeNull();
  });

  it('expired (1h+1s) token fails', async () => {
    const expiredNow = Date.now() - (60 * 60 * 1000 + 1000);
    const { value } = await mintAdminActive(basePayload, { now: expiredNow });
    expect(await verifyAdminActive(value)).toBeNull();
  });

  it('preserves mustChangePassword flag', async () => {
    const { value } = await mintAdminActive({ ...basePayload, mustChangePassword: true });
    const payload = await verifyAdminActive(value);
    expect(payload!.mustChangePassword).toBe(true);
  });

  it('cookie options include httpOnly', async () => {
    const { options } = await mintAdminActive(basePayload);
    const opts = options as Record<string, unknown>;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });
});
