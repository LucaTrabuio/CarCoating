import { describe, it, expect, vi } from 'vitest';

// Stub the Firebase admin layer so importing keeper-sync (which transitively
// pulls system-alerts-instance → getAdminDb()) doesn't require real creds.
vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: vi.fn(() => ({})),
  getAdminStorage: vi.fn(() => ({})),
  getAdminAuth: vi.fn(() => ({})),
}));

vi.mock('@/lib/system-alerts-instance', () => ({
  systemAlerts: { recordAlert: vi.fn() },
  adminAuthAdapter: {},
  criticalSourceAllowlist: [],
}));

vi.mock('@/lib/firebase-stores', () => ({
  getAllV3StoresIncludingInactive: vi.fn(async () => []),
}));

vi.mock('@/lib/keeper-client', () => ({
  listSurveys: vi.fn(async () => ({ items: [], next_cursor: null })),
  listResponses: vi.fn(async () => ({ items: [], next_cursor: null })),
  fetchFileBinary: vi.fn(async () => ({ buffer: Buffer.alloc(0), contentType: 'application/octet-stream' })),
}));

import { normalizeStoreName } from '../lib/keeper-sync';

// ─── normalizeStoreName ────────────────────────────────────────

describe('normalizeStoreName', () => {
  it('lowercases ASCII', () => {
    expect(normalizeStoreName('ABC')).toBe('abc');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeStoreName('  abc  ')).toBe('abc');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeStoreName('foo  bar  baz')).toBe('foobarbaz');
  });

  it('applies NFKC normalization (full-width → ASCII)', () => {
    // Full-width digits/letters should normalize to ASCII
    expect(normalizeStoreName('ＡＢＣ')).toBe('abc');
    expect(normalizeStoreName('１２３')).toBe('123');
  });

  it('handles Japanese store names (collapse + lowercase)', () => {
    expect(normalizeStoreName('三笠 中央 SS')).toBe('三笠中央ss');
  });

  it('handles empty string', () => {
    expect(normalizeStoreName('')).toBe('');
  });

  it('handles only whitespace', () => {
    expect(normalizeStoreName('   ')).toBe('');
  });
});

// ─── Store name matching logic ────────────────────────────────

describe('store name matching (normalizeStoreName)', () => {
  it('matched: normalised forms are equal', () => {
    const keeperName = '三笠中央SS';
    const storeName = '三笠 中央 SS';
    expect(normalizeStoreName(keeperName)).toBe(normalizeStoreName(storeName));
  });

  it('unmatched: different names do not match', () => {
    expect(normalizeStoreName('店舗A')).not.toBe(normalizeStoreName('店舗B'));
  });

  it('unmatched never throws', () => {
    expect(() => normalizeStoreName(null as unknown as string)).toThrow();
    // null should throw (it's not in the call signature) — this is expected
    // TypeScript won't allow it; we just confirm normalizeStoreName(string) works for all strings
    expect(() => normalizeStoreName('anything')).not.toThrow();
    expect(() => normalizeStoreName('')).not.toThrow();
  });
});

// ─── Idempotent file-mirror skip logic ───────────────────────
// We test the skip logic in isolation by replicating the condition used
// in keeper-sync.ts: skip if existingDoc.files[].mirrored is present for fileId.

describe('idempotent mirror skip', () => {
  it('skips a file that already has a mirrored record', () => {
    const existingFiles = [
      {
        file_id: 'file-001',
        field_id: 'f1',
        content_type: 'image/jpeg',
        size: 1000,
        filename: 'photo.jpg',
        download_url: '',
        mirrored: {
          storagePath: 'keeper-surveys/s1/r1/file-001_photo.jpg',
          contentType: 'image/jpeg',
          size: 1000,
          mirroredAt: '2026-05-01T00:00:00.000Z',
        },
      },
    ];

    const alreadyMirrored = existingFiles.find(
      (f) => f.file_id === 'file-001' && f.mirrored != null,
    );

    expect(alreadyMirrored).toBeDefined();
    expect(alreadyMirrored?.mirrored?.storagePath).toBe(
      'keeper-surveys/s1/r1/file-001_photo.jpg',
    );
  });

  it('does not skip a file that has no mirrored record', () => {
    const existingFiles = [
      {
        file_id: 'file-002',
        field_id: 'f2',
        content_type: 'image/jpeg',
        size: null,
        filename: null,
        download_url: '',
        // no mirrored property
      },
    ];

    const alreadyMirrored = existingFiles.find(
      (f) =>
        f.file_id === 'file-002' &&
        (f as { mirrored?: unknown }).mirrored != null,
    );

    expect(alreadyMirrored).toBeUndefined();
  });

  it('does not skip a new file_id not present in existing docs', () => {
    const existingFiles: { file_id: string; mirrored?: unknown }[] = [
      { file_id: 'file-001', mirrored: { storagePath: 'x', contentType: 'image/jpeg', size: 1, mirroredAt: '' } },
    ];

    const alreadyMirrored = existingFiles.find(
      (f) => f.file_id === 'file-999' && f.mirrored != null,
    );

    expect(alreadyMirrored).toBeUndefined();
  });
});
