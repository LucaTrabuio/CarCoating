
/**
 * Japanese national holidays (祝日) calculator.
 * Returns a Map<dateString, holidayName> for a given year.
 */

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month - 1, 1);
  let day = 1 + ((weekday - first.getDay() + 7) % 7);
  day += (nth - 1) * 7;
  return new Date(year, month - 1, day);
}

function vernalEquinox(year: number): number {
  // Approximate formula for 1900-2099
  if (year <= 1947) return 21;
  if (year <= 1979) return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return 20;
}

function autumnalEquinox(year: number): number {
  if (year <= 1947) return 23;
  if (year <= 1979) return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  if (year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return 23;
}

function fmt(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getJapaneseHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // Fixed holidays
  holidays.set(fmt(year, 1, 1), '元日');
  holidays.set(fmt(year, 2, 11), '建国記念の日');
  holidays.set(fmt(year, 2, 23), '天皇誕生日');
  holidays.set(fmt(year, 3, vernalEquinox(year)), '春分の日');
  holidays.set(fmt(year, 4, 29), '昭和の日');
  holidays.set(fmt(year, 5, 3), '憲法記念日');
  holidays.set(fmt(year, 5, 4), 'みどりの日');
  holidays.set(fmt(year, 5, 5), 'こどもの日');
  holidays.set(fmt(year, 8, 11), '山の日');
  holidays.set(fmt(year, 9, autumnalEquinox(year)), '秋分の日');
  holidays.set(fmt(year, 11, 3), '文化の日');
  holidays.set(fmt(year, 11, 23), '勤労感謝の日');

  // Happy Monday holidays
  const seijin = nthWeekday(year, 1, 1, 2); // 2nd Monday of January
  holidays.set(fmt(year, 1, seijin.getDate()), '成人の日');

  const umi = nthWeekday(year, 7, 1, 3); // 3rd Monday of July
  holidays.set(fmt(year, 7, umi.getDate()), '海の日');

  const keiro = nthWeekday(year, 9, 1, 3); // 3rd Monday of September
  holidays.set(fmt(year, 9, keiro.getDate()), '敬老の日');

  const sports = nthWeekday(year, 10, 1, 2); // 2nd Monday of October
  holidays.set(fmt(year, 10, sports.getDate()), 'スポーツの日');

  // 振替休日 (substitute holiday): if a holiday falls on Sunday, next Monday is a holiday
  const substitutes: [string, string][] = [];
  for (const [dateStr, name] of holidays) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getDay() === 0) {
      // Find next non-holiday weekday
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      while (holidays.has(fmt(next.getFullYear(), next.getMonth() + 1, next.getDate()))) {
        next.setDate(next.getDate() + 1);
      }
      substitutes.push([fmt(next.getFullYear(), next.getMonth() + 1, next.getDate()), `振替休日（${name}）`]);
    }
  }
  for (const [d, n] of substitutes) holidays.set(d, n);

  // 国民の休日: if a day is sandwiched between two holidays, it's also a holiday
  const sortedDates = [...holidays.keys()].sort();
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const d1 = new Date(sortedDates[i] + 'T00:00:00');
    const d2 = new Date(sortedDates[i + 1] + 'T00:00:00');
    const diff = (d2.getTime() - d1.getTime()) / 86400000;
    if (diff === 2) {
      const mid = new Date(d1);
      mid.setDate(mid.getDate() + 1);
      const midStr = fmt(mid.getFullYear(), mid.getMonth() + 1, mid.getDate());
      if (!holidays.has(midStr) && mid.getDay() !== 0) {
        holidays.set(midStr, '国民の休日');
      }
    }
  }

  return holidays;
}

/** Get holidays for a specific month. */
export function getMonthHolidays(year: number, month: number): Map<string, string> {
  const all = getJapaneseHolidays(year);
  const prefix = fmt(year, month, 1).slice(0, 7); // "YYYY-MM"
  const result = new Map<string, string>();
  for (const [date, name] of all) {
    if (date.startsWith(prefix)) result.set(date, name);
  }
  return result;
}
