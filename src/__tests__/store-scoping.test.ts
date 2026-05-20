import { describe, it, expect } from 'vitest';
import { canManageStore, type SessionUser } from '../lib/auth';

describe('store scoping — canManageStore', () => {
  const superAdmin: SessionUser = {
    uid: 'sa-1',
    email: 'admin@test.com',
    role: 'super_admin',
    managed_stores: [],
  };

  const storeAdmin: SessionUser = {
    uid: 'store-1',
    email: 'store@test.com',
    role: 'store_admin',
    managed_stores: ['sapporo-001', 'eniwa-001'],
  };

  it('super_admin bypasses scope check for any storeId', () => {
    expect(canManageStore(superAdmin, 'sapporo-001')).toBe(true);
    expect(canManageStore(superAdmin, 'foreign-store')).toBe(true);
    expect(canManageStore(superAdmin, '')).toBe(true);
  });

  it('store_admin returns true only for storeIds in managed_stores', () => {
    expect(canManageStore(storeAdmin, 'sapporo-001')).toBe(true);
    expect(canManageStore(storeAdmin, 'eniwa-001')).toBe(true);
  });

  it('store_admin returns false for storeIds not in managed_stores', () => {
    expect(canManageStore(storeAdmin, 'tokyo-001')).toBe(false);
    expect(canManageStore(storeAdmin, 'foreign-store')).toBe(false);
  });

  it('store_admin with empty managed_stores is denied everything', () => {
    const empty: SessionUser = { ...storeAdmin, managed_stores: [] };
    expect(canManageStore(empty, 'sapporo-001')).toBe(false);
  });
});
