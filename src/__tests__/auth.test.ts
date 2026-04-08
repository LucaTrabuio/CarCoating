import { describe, it, expect } from 'vitest';
import { canManageStore, type SessionUser } from '../lib/auth';

// Note: Full auth integration tests require Firebase emulator.
// These tests cover the pure logic functions.

describe('canManageStore', () => {
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
    managed_stores: ['sapporo-001', 'sapporo-002'],
  };

  it('super_admin can manage any store', () => {
    expect(canManageStore(superAdmin, 'any-store-id')).toBe(true);
    expect(canManageStore(superAdmin, 'sapporo-001')).toBe(true);
  });

  it('store_admin can manage assigned stores', () => {
    expect(canManageStore(storeAdmin, 'sapporo-001')).toBe(true);
    expect(canManageStore(storeAdmin, 'sapporo-002')).toBe(true);
  });

  it('store_admin cannot manage unassigned stores', () => {
    expect(canManageStore(storeAdmin, 'tokyo-001')).toBe(false);
    expect(canManageStore(storeAdmin, '')).toBe(false);
  });

  it('store_admin with empty managed_stores cannot manage anything', () => {
    const emptyAdmin: SessionUser = { ...storeAdmin, managed_stores: [] };
    expect(canManageStore(emptyAdmin, 'sapporo-001')).toBe(false);
  });
});
