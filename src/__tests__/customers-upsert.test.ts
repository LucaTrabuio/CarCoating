import { describe, it, expect, vi } from 'vitest';

// Test the pure normalizeEmail function without Firestore
describe('normalizeEmail', () => {
  it('lowercases and trims', async () => {
    vi.resetModules();
    const { normalizeEmail } = await import('../lib/customers');
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('handles already-normalized input', async () => {
    vi.resetModules();
    const { normalizeEmail } = await import('../lib/customers');
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});

// Test upsertCustomer logic via mocked Firestore
describe('upsertCustomer — field fill logic', () => {
  it('sets bookingCount=1 and inquiryCount=0 for new booking', async () => {
    vi.resetModules();
    const writes: Record<string, unknown>[] = [];

    vi.doMock('../lib/firebase-admin', () => {
      return {
        getAdminDb: () => ({
          runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
            const tx = {
              get: async () => ({ exists: false }),
              set: (_ref: unknown, data: Record<string, unknown>) => {
                writes.push(data);
              },
              update: () => {},
            };
            await fn(tx);
          },
          collection: () => ({
            doc: () => ({
              collection: () => ({
                doc: () => ({}),
              }),
            }),
          }),
        }),
      };
    });

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: { increment: (n: number) => ({ _increment: n }) },
    }));

    const { upsertCustomer } = await import('../lib/customers');

    await upsertCustomer({
      storeId: 'store-001',
      email: 'Test@Example.COM',
      name: 'Test User',
      phone: '090-1234-5678',
      source: 'booking',
    });

    expect(writes.length).toBe(1);
    expect(writes[0]).toMatchObject({
      email: 'test@example.com',
      bookingCount: 1,
      inquiryCount: 0,
    });
  });

  it('sets inquiryCount=1 and bookingCount=0 for new inquiry', async () => {
    vi.resetModules();
    const writes: Record<string, unknown>[] = [];

    vi.doMock('../lib/firebase-admin', () => ({
      getAdminDb: () => ({
        runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
          const tx = {
            get: async () => ({ exists: false }),
            set: (_ref: unknown, data: Record<string, unknown>) => { writes.push(data); },
            update: () => {},
          };
          await fn(tx);
        },
        collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),
      }),
    }));

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: { increment: (n: number) => ({ _increment: n }) },
    }));

    const { upsertCustomer } = await import('../lib/customers');
    await upsertCustomer({ storeId: 'store-001', email: 'b@b.com', name: 'B', source: 'inquiry' });

    expect(writes[0]).toMatchObject({ bookingCount: 0, inquiryCount: 1 });
  });

  it('does not overwrite existing name when incoming name is empty', async () => {
    vi.resetModules();
    const updates: Record<string, unknown>[] = [];

    vi.doMock('../lib/firebase-admin', () => ({
      getAdminDb: () => ({
        runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
          const tx = {
            get: async () => ({
              exists: true,
              data: () => ({
                email: 'c@c.com',
                name: 'Existing Name',
                phone: '090-000-0000',
                bookingCount: 2,
                inquiryCount: 1,
              }),
            }),
            set: () => {},
            update: (_ref: unknown, data: Record<string, unknown>) => { updates.push(data); },
          };
          await fn(tx);
        },
        collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),
      }),
    }));

    vi.doMock('firebase-admin/firestore', () => ({
      FieldValue: { increment: (n: number) => ({ _increment: n }) },
    }));

    const { upsertCustomer } = await import('../lib/customers');
    await upsertCustomer({ storeId: 'store-001', email: 'c@c.com', name: '', source: 'inquiry' });

    expect(updates.length).toBe(1);
    expect(updates[0]).not.toHaveProperty('name');
  });
});
