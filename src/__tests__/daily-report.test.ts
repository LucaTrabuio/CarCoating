import { describe, it, expect } from 'vitest';
import {
  buildMorningReport,
  buildEveningReport,
  buildKeeperSyncSection,
  type StoreInfo,
  type ReservationRow,
  type InquiryRow,
} from '../lib/daily-report';
import type { KeeperSyncLastRun } from '../lib/keeper-types';

const stores: StoreInfo[] = [
  { storeId: 'store-a', storeName: 'テスト店A' },
  { storeId: 'store-b', storeName: 'テスト店B' },
];

const DATE = '2026-05-19';

// ─── buildMorningReport ───

describe('buildMorningReport', () => {
  it('returns the correct subject with date', () => {
    const { subject } = buildMorningReport([], [], DATE);
    expect(subject).toBe(`[本日のご予約] ${DATE}`);
  });

  it('renders fallback when zero reservations', () => {
    const { html } = buildMorningReport(stores, [], DATE);
    expect(html).toContain('本日のご予約はありません');
  });

  it('renders per-store section for each store that has reservations', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '10:00', customerName: '山田太郎', serviceType: 'KeePer', vehicleInfo: 'トヨタ カムリ' },
      { storeId: 'store-b', time: '14:00', customerName: '鈴木花子' },
    ];
    const { html } = buildMorningReport(stores, reservations, DATE);
    expect(html).toContain('テスト店A');
    expect(html).toContain('テスト店B');
  });

  it('skips stores with zero reservations', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '10:00', customerName: '山田太郎' },
    ];
    const { html } = buildMorningReport(stores, reservations, DATE);
    expect(html).toContain('テスト店A');
    expect(html).not.toContain('テスト店B');
  });

  it('HTML-escapes XSS attempts in customer name', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '10:00', customerName: '<script>alert(1)</script>' },
    ];
    const { html } = buildMorningReport(stores, reservations, DATE);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML-escapes XSS in vehicleInfo', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '09:00', customerName: 'テスト', vehicleInfo: '"><img src=x onerror=alert(1)>' },
    ];
    const { html } = buildMorningReport(stores, reservations, DATE);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('HTML-escapes ampersands in store names', () => {
    const storesWithAmp: StoreInfo[] = [{ storeId: 'x', storeName: 'A & B店' }];
    const reservations: ReservationRow[] = [{ storeId: 'x', time: '10:00', customerName: 'テスト' }];
    const { html } = buildMorningReport(storesWithAmp, reservations, DATE);
    expect(html).toContain('A &amp; B店');
  });
});

// ─── buildEveningReport ───

describe('buildEveningReport', () => {
  it('returns the correct subject with date', () => {
    const { subject } = buildEveningReport([], [], [], DATE);
    expect(subject).toBe(`[本日の活動] ${DATE}`);
  });

  it('renders fallback when zero activity', () => {
    const { html } = buildEveningReport(stores, [], [], DATE);
    expect(html).toContain('本日のアクティビティはありませんでした');
  });

  it('renders reservation sub-section when there are new reservations', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '11:00', customerName: '田中一郎', serviceType: 'ダイヤモンド' },
    ];
    const { html } = buildEveningReport(stores, reservations, [], DATE);
    expect(html).toContain('本日いただいた新規予約');
    expect(html).toContain('テスト店A');
    expect(html).toContain('田中一郎');
  });

  it('renders inquiry sub-section when there are new inquiries', () => {
    const inquiries: InquiryRow[] = [
      { storeId: 'store-b', customerName: '佐藤次郎', message: 'お得なコースを教えてください' },
    ];
    const { html } = buildEveningReport(stores, [], inquiries, DATE);
    expect(html).toContain('本日いただいたお問い合わせ');
    expect(html).toContain('テスト店B');
    expect(html).toContain('佐藤次郎');
  });

  it('skips stores with neither reservations nor inquiries', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '11:00', customerName: '田中一郎' },
    ];
    const { html } = buildEveningReport(stores, reservations, [], DATE);
    expect(html).not.toContain('テスト店B');
  });

  it('HTML-escapes XSS in customer name', () => {
    const inquiries: InquiryRow[] = [
      { storeId: 'store-a', customerName: '<script>evil()</script>', message: 'test' },
    ];
    const { html } = buildEveningReport(stores, [], inquiries, DATE);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('HTML-escapes newlines in inquiry message via escMultiline', () => {
    const inquiries: InquiryRow[] = [
      { storeId: 'store-a', customerName: 'テスト', message: '1行目\n2行目' },
    ];
    const { html } = buildEveningReport(stores, [], inquiries, DATE);
    expect(html).toContain('<br>');
    expect(html).not.toContain('1行目\n2行目');
  });

  it('HTML-escapes XSS in inquiry message', () => {
    const inquiries: InquiryRow[] = [
      { storeId: 'store-a', customerName: 'テスト', message: '<img src=x onerror=alert(1)>' },
    ];
    const { html } = buildEveningReport(stores, [], inquiries, DATE);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('groups reservations and inquiries separately per store', () => {
    const reservations: ReservationRow[] = [
      { storeId: 'store-a', time: '10:00', customerName: '予約者A' },
    ];
    const inquiries: InquiryRow[] = [
      { storeId: 'store-a', customerName: '問合者A', message: 'test' },
    ];
    const { html } = buildEveningReport(stores, reservations, inquiries, DATE);
    expect(html).toContain('本日いただいた新規予約');
    expect(html).toContain('本日いただいたお問い合わせ');
    expect(html).toContain('予約者A');
    expect(html).toContain('問合者A');
  });
});

// ─── buildKeeperSyncSection ───────────────────────────────────

// Fixed reference "now" for deterministic tests: 2026-05-20 08:00 JST (= 23:00 UTC on 2026-05-19)
const NOW_UTC = new Date('2026-05-19T23:00:00.000Z');

// Fresh ranAt: 30 minutes before NOW_UTC
const FRESH_RAN_AT = '2026-05-19T22:30:00.000Z';

// Stale ranAt: 2 days before NOW_UTC
const STALE_RAN_AT = '2026-05-17T22:30:00.000Z';

const freshLastRun: KeeperSyncLastRun = {
  ranAt: FRESH_RAN_AT,
  trigger: 'cron',
  surveysProcessed: 2,
  responsesProcessed: 3,
  filesMirrored: 5,
  stores: [
    {
      storeName: '三笠中央SS',
      keeperStoreId: 'shop_194',
      matchedStoreId: 'store-mikasa',
      matchStatus: 'matched',
      newResponses: 2,
      filledFields: ['store_name_full', 'phone', 'coating_menu', 'exterior_photos'],
    },
    {
      storeName: 'よんななSS',
      keeperStoreId: 'shop_005',
      matchedStoreId: null,
      matchStatus: 'unmatched',
      newResponses: 1,
      filledFields: ['store_name_short', 'business_hours', 'keeper_rank'],
    },
  ],
};

describe('buildKeeperSyncSection', () => {
  it('null lastRun → renders "なし" line with no date', () => {
    const html = buildKeeperSyncSection(null, { now: NOW_UTC });
    expect(html).toContain('本日のKeePer調査同期: なし');
    expect(html).not.toContain('前回');
  });

  it('stale lastRun (ranAt 2 days ago) → renders "なし（前回 …）" line', () => {
    const stale: KeeperSyncLastRun = { ...freshLastRun, ranAt: STALE_RAN_AT };
    const html = buildKeeperSyncSection(stale, { now: NOW_UTC });
    expect(html).toContain('本日のKeePer調査同期: なし（前回');
    expect(html).toContain('前回');
    expect(html).toContain('JST');
  });

  it('fresh lastRun → renders section header with time', () => {
    const html = buildKeeperSyncSection(freshLastRun, { now: NOW_UTC });
    expect(html).toContain('🔄 KeePer調査同期');
    expect(html).toContain('JST');
    // FRESH_RAN_AT = 22:30 UTC = 07:30 JST
    expect(html).toContain('07:30');
  });

  it('fresh lastRun → renders matched store with 照合済', () => {
    const html = buildKeeperSyncSection(freshLastRun, { now: NOW_UTC });
    expect(html).toContain('三笠中央SS');
    expect(html).toContain('照合済');
  });

  it('fresh lastRun → renders unmatched store with 未照合', () => {
    const html = buildKeeperSyncSection(freshLastRun, { now: NOW_UTC });
    expect(html).toContain('よんななSS');
    expect(html).toContain('未照合');
  });

  it('fresh lastRun → field IDs are mapped to Japanese labels', () => {
    const html = buildKeeperSyncSection(freshLastRun, { now: NOW_UTC });
    expect(html).toContain('取扱コーティングメニュー');
    expect(html).toContain('電話番号');
    expect(html).toContain('外観写真');
    expect(html).toContain('KeePer認定ランク');
  });

  it('XSS in store name is escaped', () => {
    const xssRun: KeeperSyncLastRun = {
      ...freshLastRun,
      stores: [
        {
          storeName: '<script>alert(1)</script>',
          keeperStoreId: 'shop_xss',
          matchedStoreId: null,
          matchStatus: 'unmatched',
          newResponses: 1,
          filledFields: ['phone'],
        },
      ],
    };
    const html = buildKeeperSyncSection(xssRun, { now: NOW_UTC });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('no answer value strings appear in the rendered output', () => {
    const sensitiveValue = 'SECRET_ANSWER_VALUE';
    // filledFields contains only keys — never values
    const html = buildKeeperSyncSection(freshLastRun, { now: NOW_UTC });
    expect(html).not.toContain(sensitiveValue);
  });

  it('PII boundary: concrete answer values (phone/email/address/token) never render', () => {
    // The summary type only carries field-id KEYS, so even if a future
    // regression tried to smuggle a value into a key slot, none of these
    // realistic PII strings should ever appear in the rendered section.
    const phone = '090-1234-5678';
    const email = 'owner@mikasa-ss.example.jp';
    const address = '北海道三笠市幸町5番地';
    const respondentToken = 'resp_tok_abc123XYZ';
    const signerName = '山田 太郎';

    const run: KeeperSyncLastRun = {
      ...freshLastRun,
      stores: [
        {
          storeName: '三笠中央SS',
          keeperStoreId: 'shop_194',
          matchedStoreId: 'store-mikasa',
          matchStatus: 'matched',
          newResponses: 1,
          // keys only — these labels map to phone/email/address fields
          filledFields: ['phone', 'email', 'address_line'],
        },
      ],
    };

    const html = buildKeeperSyncSection(run, { now: NOW_UTC });
    for (const pii of [phone, email, address, respondentToken, signerName]) {
      expect(html).not.toContain(pii);
    }
    // The field labels (not the values) SHOULD render.
    expect(html).toContain('電話番号');
    expect(html).toContain('メールアドレス');
    expect(html).toContain('住所');
  });
});

// ─── Integration: morning vs evening ─────────────────────────

describe('buildMorningReport includes Keeper sync section', () => {
  it('includes 🔄 KeePer調査同期 when lastRun is fresh', () => {
    const { html } = buildMorningReport(stores, [], DATE, freshLastRun, NOW_UTC);
    expect(html).toContain('🔄 KeePer調査同期');
  });

  it('includes "本日のKeePer調査同期: なし" when lastRun is null', () => {
    const { html } = buildMorningReport(stores, [], DATE, null, NOW_UTC);
    expect(html).toContain('本日のKeePer調査同期: なし');
  });

  it('still works with legacy 3-arg signature (defaults)', () => {
    const { subject, html } = buildMorningReport(stores, [], DATE);
    expect(subject).toBe(`[本日のご予約] ${DATE}`);
    // Default lastRun=null → shows "なし"
    expect(html).toContain('本日のKeePer調査同期: なし');
  });
});

describe('buildEveningReport does NOT include Keeper sync section', () => {
  it('does not contain 🔄 KeePer調査同期', () => {
    const { html } = buildEveningReport(stores, [], [], DATE);
    expect(html).not.toContain('🔄 KeePer調査同期');
    expect(html).not.toContain('KeePer調査同期');
  });
});
