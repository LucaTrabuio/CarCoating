import { describe, it, expect } from 'vitest';
import { reservationRequestSchema } from '../lib/validations';

function futureDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const BASE_VISIT = {
  type: 'visit' as const,
  storeId: 'store-001',
  name: 'Yamada Taro',
  phone: '090-1234-5678',
  email: 'taro@example.com',
  date: futureDate(),
  time: '10:00',
};

const BASE_INQUIRY = {
  type: 'inquiry' as const,
  storeId: 'store-001',
  name: 'Hanako',
  phone: '03-1234-5678',
  email: 'hanako@example.com',
};

describe('reservationRequestSchema — valid inputs', () => {
  it('accepts a valid visit reservation with future date+time', () => {
    const result = reservationRequestSchema.safeParse(BASE_VISIT);
    expect(result.success).toBe(true);
  });

  it('accepts a valid inquiry reservation without date/time', () => {
    const result = reservationRequestSchema.safeParse(BASE_INQUIRY);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields on inquiry', () => {
    const result = reservationRequestSchema.safeParse({
      ...BASE_INQUIRY,
      notes: 'Please contact me in the afternoon.',
      vehicleInfo: 'Toyota Corolla 2020',
      selectedCoatings: ['コーティングA'],
      selectedOptions: ['オプション1'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts autoConfirm boolean on visit', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, autoConfirm: false });
    expect(result.success).toBe(true);
  });
});

describe('reservationRequestSchema — required field rejections', () => {
  it('rejects missing name', () => {
    const { name: _name, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing phone', () => {
    const { phone: _phone, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const { email: _email, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing storeId', () => {
    const { storeId: _storeId, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty storeId', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, storeId: '' });
    expect(result.success).toBe(false);
  });
});

describe('reservationRequestSchema — email validation', () => {
  it('rejects bad email format (no @)', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, email: 'notanemail' });
    expect(result.success).toBe(false);
  });

  it('rejects bad email format (spaces)', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, email: 'bad email@x.com' });
    expect(result.success).toBe(false);
  });

  it('accepts standard email', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, email: 'a@b.co.jp' });
    expect(result.success).toBe(true);
  });
});

describe('reservationRequestSchema — type validation', () => {
  it('rejects invalid type', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, type: 'other' });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const { type: _type, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('reservationRequestSchema — visit date/time validation', () => {
  it('rejects visit with bad date format', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, date: '2024/01/01' });
    expect(result.success).toBe(false);
  });

  it('rejects visit with bad time format', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, time: '9:00' });
    expect(result.success).toBe(false);
  });

  it('rejects visit with past date', () => {
    const result = reservationRequestSchema.safeParse({ ...BASE_VISIT, date: '2020-01-01', time: '10:00' });
    expect(result.success).toBe(false);
  });

  it('rejects visit with missing date', () => {
    const { date: _date, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects visit with missing time', () => {
    const { time: _time, ...rest } = BASE_VISIT;
    const result = reservationRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
