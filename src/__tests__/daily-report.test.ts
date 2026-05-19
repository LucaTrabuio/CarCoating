import { describe, it, expect } from 'vitest';
import {
  buildMorningReport,
  buildEveningReport,
  type StoreInfo,
  type ReservationRow,
  type InquiryRow,
} from '../lib/daily-report';

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
