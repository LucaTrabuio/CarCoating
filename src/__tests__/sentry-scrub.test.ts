import { describe, it, expect } from 'vitest';
import { scrubEvent } from '../lib/sentry-scrub';

describe('scrubEvent — denylist key filtering', () => {
  it('replaces denylist keys with [Filtered]', () => {
    const event = {
      extra: {
        password: 'secret123',
        token: 'abc',
        email: 'user@example.com',
        name: 'Taro',
        phone: '090-1234-5678',
      },
    };
    const result = scrubEvent(event);
    expect(result.extra.password).toBe('[Filtered]');
    expect(result.extra.token).toBe('[Filtered]');
    expect(result.extra.email).toBe('[Filtered]');
    expect(result.extra.name).toBe('[Filtered]');
    expect(result.extra.phone).toBe('[Filtered]');
  });

  it('is case-insensitive for key matching', () => {
    const event = { extra: { Password: 'hunter2', AccessToken: 'tok' } };
    const result = scrubEvent(event);
    expect(result.extra.Password).toBe('[Filtered]');
    expect(result.extra.AccessToken).toBe('[Filtered]');
  });

  it('preserves safe keys unchanged', () => {
    const event = { extra: { id: '123', message: 'ok', count: 5 } };
    const result = scrubEvent(event);
    expect(result.extra.id).toBe('123');
    expect(result.extra.message).toBe('ok');
    expect(result.extra.count).toBe(5);
  });
});

describe('scrubEvent — free-text regex redaction', () => {
  it('redacts email addresses in string values', () => {
    const event = { extra: { note: 'Contact user@example.com today' } };
    const result = scrubEvent(event);
    expect(result.extra.note).not.toContain('user@example.com');
    expect(result.extra.note).toContain('[REDACTED]');
  });

  it('redacts JP phone numbers in string values', () => {
    const event = { extra: { info: 'Call 090-1234-5678 now' } };
    const result = scrubEvent(event);
    expect(result.extra.info).not.toContain('090-1234-5678');
    expect(result.extra.info).toContain('[REDACTED]');
  });

  it('redacts card-like 16-digit numbers', () => {
    const event = { extra: { data: 'Card: 4111 1111 1111 1111' } };
    const result = scrubEvent(event);
    expect(result.extra.data).toContain('[REDACTED]');
  });

  it('redacts JP license-plate-ish patterns', () => {
    const event = { extra: { info: '品川 500 あ 1234' } };
    const result = scrubEvent(event);
    expect(result.extra.info).toContain('[REDACTED]');
  });
});

describe('scrubEvent — nested traversal', () => {
  it('walks nested objects', () => {
    const event = {
      extra: {
        level1: {
          level2: {
            password: 'deep-secret',
            safe: 'keep-this',
          },
        },
      },
    };
    const result = scrubEvent(event);
    expect(result.extra.level1.level2.password).toBe('[Filtered]');
    expect(result.extra.level1.level2.safe).toBe('keep-this');
  });

  it('walks arrays', () => {
    const event = {
      extra: {
        items: [
          { id: 1, token: 'tok1' },
          { id: 2, token: 'tok2' },
        ],
      },
    };
    const result = scrubEvent(event);
    expect(result.extra.items[0].token).toBe('[Filtered]');
    expect(result.extra.items[1].token).toBe('[Filtered]');
    expect(result.extra.items[0].id).toBe(1);
  });

  it('walks exception.values and redacts value/message strings', () => {
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Failed for user@example.com',
            message: 'Contact 090-1234-5678',
          },
        ],
      },
    };
    const result = scrubEvent(event);
    const ev = result.exception.values[0];
    expect(ev.value).not.toContain('user@example.com');
    expect(ev.message).not.toContain('090-1234-5678');
    expect(ev.type).toBe('Error');
  });
});

describe('scrubEvent — request stripping', () => {
  it('removes request.cookies', () => {
    const event = {
      request: {
        url: 'https://example.com',
        cookies: { __session: 'tok', other: 'val' },
      },
    };
    const result = scrubEvent(event);
    expect(result.request.cookies).toBeUndefined();
    expect(result.request.url).toBe('https://example.com');
  });

  it('removes Cookie and Authorization headers (case-insensitive)', () => {
    const event = {
      request: {
        url: 'https://example.com',
        headers: {
          Cookie: '__session=abc',
          Authorization: 'Bearer tok',
          'Content-Type': 'application/json',
        },
      },
    };
    const result = scrubEvent(event);
    expect(result.request.headers.Cookie).toBeUndefined();
    expect(result.request.headers.Authorization).toBeUndefined();
    expect(result.request.headers['Content-Type']).toBe('application/json');
  });
});

describe('scrubEvent — user stripping', () => {
  it('removes event.user entirely', () => {
    const event = {
      user: { id: 'u1', email: 'admin@example.com' },
      extra: { ok: true },
    };
    const result = scrubEvent(event);
    expect(result.user).toBeUndefined();
    expect(result.extra.ok).toBe(true);
  });
});

describe('scrubEvent — clean event passthrough', () => {
  it('does not alter a clean event with safe keys', () => {
    const event = {
      message: 'App started',
      level: 'info',
      extra: { id: 'store-123', count: 42, flag: true },
      tags: { environment: 'production' },
    };
    const result = scrubEvent(event);
    expect(result.message).toBe('App started');
    expect(result.level).toBe('info');
    expect(result.extra.id).toBe('store-123');
    expect(result.extra.count).toBe(42);
    expect(result.extra.flag).toBe(true);
    expect(result.tags.environment).toBe('production');
  });
});
