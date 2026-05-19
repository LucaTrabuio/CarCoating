export const PASSWORD_MAX_AGE_DAYS = 90;
export const PASSWORD_WARN_DAYS = [7, 4, 1];
export const PASSWORD_MIN_LENGTH = 8;
export const TEMP_PASSWORD_LENGTH = 14;

const UPPERCASE = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`パスワードは${PASSWORD_MIN_LENGTH}文字以上必要です`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含める必要があります');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含める必要があります');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('数字を含める必要があります');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('記号を含める必要があります');
  }

  return { valid: errors.length === 0, errors };
}

export function isPasswordExpired(passwordChangedAt: string | undefined | null): boolean {
  if (!passwordChangedAt) return true;
  const changed = new Date(passwordChangedAt).getTime();
  const now = Date.now();
  const ageDays = (now - changed) / (1000 * 60 * 60 * 24);
  return ageDays >= PASSWORD_MAX_AGE_DAYS;
}

export function daysUntilExpiry(passwordChangedAt: string | undefined | null): number {
  if (!passwordChangedAt) return 0;
  const changed = new Date(passwordChangedAt).getTime();
  const now = Date.now();
  const ageDays = (now - changed) / (1000 * 60 * 60 * 24);
  return Math.max(0, PASSWORD_MAX_AGE_DAYS - ageDays);
}

export function generateTempPassword(): string {
  let result = '';

  const pick = (charset: string): string => {
    const arr = new Uint8Array(1);
    crypto.getRandomValues(arr);
    return charset[arr[0] % charset.length];
  };

  result += pick(UPPERCASE);
  result += pick(LOWERCASE);
  result += pick(DIGITS);
  result += pick(SYMBOLS);

  while (result.length < TEMP_PASSWORD_LENGTH) {
    result += pick(ALL_CHARS);
  }

  // Fisher-Yates shuffle using crypto
  const arr = result.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const randArr = new Uint8Array(1);
    crypto.getRandomValues(randArr);
    const j = randArr[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join('');
}

/**
 * Node.js-only version of generateTempPassword using node:crypto.
 * Only import this from server-side code.
 * Browser / Edge code should use generateTempPassword() (Web Crypto).
 */
export function generateTempPasswordNode(): string {
  // Lazy require so this module remains browser-safe at import time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomBytes } = require('node:crypto') as { randomBytes: (n: number) => Buffer };

  const upperArr = 'ABCDEFGHJKMNPQRSTUVWXYZ'.split('');
  const lowerArr = 'abcdefghjkmnpqrstuvwxyz'.split('');
  const digitArr = '23456789'.split('');
  const symbolArr = '!@#$%^&*()-_=+[]{}'.split('');
  const allArr = [...upperArr, ...lowerArr, ...digitArr, ...symbolArr];

  const pickFrom = (arr: string[]): string => {
    const buf = randomBytes(1);
    return arr[buf[0] % arr.length];
  };

  const result = [
    pickFrom(upperArr),
    pickFrom(lowerArr),
    pickFrom(digitArr),
    pickFrom(symbolArr),
  ];

  while (result.length < TEMP_PASSWORD_LENGTH) {
    result.push(pickFrom(allArr));
  }

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}
