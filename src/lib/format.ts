const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** Format YYYY-MM-DD as "YYYY/MM/DD". */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/** Format YYYY-MM-DD + HH:MM as "YYYY/MM/DD（曜）HH:MM". */
export function formatDateTime(date: string, time?: string): string {
  const d = new Date(date + (time ? `T${time}:00+09:00` : 'T00:00:00+09:00'));
  if (isNaN(d.getTime())) return time ? `${date} ${time}` : date;
  const dayLabel = DAY_LABELS[d.getDay()];
  const ymd = formatDate(d);
  return time ? `${ymd}（${dayLabel}）${time}` : `${ymd}（${dayLabel}）`;
}
