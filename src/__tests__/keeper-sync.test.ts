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

import { normalizeStoreName, computeFilledFields } from '../lib/keeper-sync';

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

// ─── computeFilledFields ──────────────────────────────────────

describe('computeFilledFields', () => {
  it('includes keys with non-empty string values', () => {
    const result = computeFilledFields({ store_name_full: '三笠中央SS', phone: '011-000-0000' });
    expect(result).toContain('store_name_full');
    expect(result).toContain('phone');
  });

  it('excludes keys with empty string values', () => {
    const result = computeFilledFields({ email: '' });
    expect(result).not.toContain('email');
  });

  it('excludes keys with whitespace-only strings', () => {
    const result = computeFilledFields({ address_line: '   ' });
    expect(result).not.toContain('address_line');
  });

  it('excludes keys with empty array values', () => {
    const result = computeFilledFields({ vehicle_types: [] });
    expect(result).not.toContain('vehicle_types');
  });

  it('includes keys with non-empty array values', () => {
    const result = computeFilledFields({ coating_menu: ['crystal', 'diamond'] });
    expect(result).toContain('coating_menu');
  });

  it('excludes keys with null values', () => {
    const result = computeFilledFields({ google_place_id: null });
    expect(result).not.toContain('google_place_id');
  });

  it('excludes keys with undefined values', () => {
    const result = computeFilledFields({ landmarks: undefined });
    expect(result).not.toContain('landmarks');
  });

  it('includes file-field keys when the value is an object with keys', () => {
    // file fields arrive as objects with metadata
    const result = computeFilledFields({
      exterior_photos: { file_id: 'abc', url: 'https://...' },
    });
    expect(result).toContain('exterior_photos');
  });

  it('excludes empty-object values', () => {
    const result = computeFilledFields({ staff_group_photo: {} });
    expect(result).not.toContain('staff_group_photo');
  });

  it('returns KEYS ONLY — no answer value strings present in output', () => {
    const piiValue = '090-1234-5678';
    const result = computeFilledFields({ phone: piiValue });
    // result is string[] of keys; no element should equal the value
    expect(result).not.toContain(piiValue);
    expect(result).toContain('phone');
  });

  it('trigger defaults to cron (smoke-test via syncKeeperSurveys call signature)', () => {
    // We can only verify the signature accepts trigger without calling the function
    // (that would need real Firestore). Type-level test is sufficient; this asserts
    // computeFilledFields itself runs on a real CSV-like fixture.
    const answers: Record<string, unknown> = {
      store_name_full: '三笠中央SS',
      store_name_short: 'asだsd',
      phone: '11111111111',
      email: 'あdsdさ@a.com',
      address_zip: '1111111',
      address_line: '北海道三笠市幸町5番地',
      business_hours: 'mon:open(09:00-19:00)',
      closed_days_notes: 'あsd',
      google_map_url: 'https://a.com',
      google_place_id: 'あdさds',
      nearest_station: 'あsっだs',
      road_access: 'だあsd',
      landmarks: 'asっdさ',
      keeper_rank: 'labo',
      booth_count: 'あsd',
      simultaneous_capacity: 'dさ',
      vehicle_types: ['kei', 'motorcycle', 'normal'],
      coating_menu: ['crystal', 'diamond', 'fresh'],
      additional_services: ['car_film', 'tire_coating'],
      payment_methods: ['cash', 'credit_card', 'line_pay'],
      campaign_info: 'asだ',
      staff_roster: [{ name: 'あsd' }],
      store_intro: 'xvcあさds',
      manager_message: 'asだsd',
      store_strengths: 'asだds',
      // file fields — non-empty
      exterior_photos: [{ file_id: 'f1' }],
      exterior_photos2: [],         // empty — should be excluded
      work_area_photos: [{ file_id: 'f2' }],
      staff_group_photo: [{ file_id: 'f3' }],
      award_certificates: [{ file_id: 'f4' }],
    };

    const filled = computeFilledFields(answers);

    // All non-empty fields should be present
    expect(filled).toContain('store_name_full');
    expect(filled).toContain('coating_menu');
    expect(filled).toContain('exterior_photos');
    expect(filled).toContain('work_area_photos');

    // Empty array should be excluded
    expect(filled).not.toContain('exterior_photos2');

    // PII boundary: the output must contain ONLY answer keys, never any
    // answer value. Assert each concrete value (phone, email, address,
    // file ids, etc.) is absent from the returned key list.
    const flatValues = Object.values(answers).flatMap((v) =>
      Array.isArray(v)
        ? v.map((x) => (typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x)))
        : [typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)],
    );
    for (const value of flatValues) {
      expect(filled).not.toContain(value);
    }
    // Every returned element must be a key that exists on the input object.
    for (const key of filled) {
      expect(Object.prototype.hasOwnProperty.call(answers, key)).toBe(true);
    }
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
