'use client';

import { useMemo } from 'react';
import type { WeeklyTemplate, DateOverride, CellStatus } from '../types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface CalendarCell {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  dayOfWeek: number;
}

export interface CalendarGridProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  holidays: Map<string, string>;
  overrides: Record<string, DateOverride>;
  templateByDay: Record<string, WeeklyTemplate>;
}

export default function CalendarGrid({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  holidays,
  overrides,
  templateByDay,
}: CalendarGridProps) {
  const calendarGrid = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);
    const startWeekday = firstOfMonth.getDay();
    const totalDays = lastOfMonth.getDate();
    const today = ymd(new Date());
    const cells: CalendarCell[] = [];

    const prevLast = new Date(year, month - 1, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, prevLast - i);
      cells.push({ date: ymd(d), inMonth: false, isToday: ymd(d) === today, dayOfWeek: d.getDay() });
    }
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month - 1, day);
      const dateStr = ymd(d);
      cells.push({ date: dateStr, inMonth: true, isToday: dateStr === today, dayOfWeek: d.getDay() });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      const d = new Date(year, month, nextDay++);
      cells.push({ date: ymd(d), inMonth: false, isToday: false, dayOfWeek: d.getDay() });
    }
    return cells;
  }, [year, month]);

  function getCellStatus(cell: { date: string; dayOfWeek: number }): CellStatus {
    const holiday = holidays.get(cell.date);
    const ov = overrides[cell.date];
    const tpl = templateByDay[String(cell.dayOfWeek)];
    const isTemplateOff = tpl?.closed === true;

    if (ov) {
      return { status: ov.closed ? 'closed-override' : 'override', holiday, isTemplateOff };
    }
    if (isTemplateOff) {
      return { status: 'closed-template', holiday, isTemplateOff };
    }
    if (holiday) {
      return { status: 'holiday', holiday, isTemplateOff };
    }
    return { status: 'open', holiday, isTemplateOff };
  }

  const bgColor: Record<string, string> = {
    'out': 'bg-gray-50 text-gray-300',
    'open': 'bg-white hover:border-gray-300',
    'holiday': 'bg-pink-50 hover:border-pink-300',
    'closed-template': 'bg-red-50 text-red-400',
    'closed-override': 'bg-red-100 text-red-600',
    'override': 'bg-amber-50 border-amber-200',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 w-full lg:w-[420px] shrink-0">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevMonth}
          className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
        >
          &#8249;
        </button>
        <span className="font-bold text-sm text-gray-800">
          {year}年{month}月
        </span>
        <button
          onClick={onNextMonth}
          className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
        >
          &#8250;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-gray-400 font-bold mb-0.5">
        {DAY_LABELS.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {calendarGrid.map((cell, i) => {
          const info = cell.inMonth
            ? getCellStatus(cell)
            : { status: 'out' as const, holiday: undefined, isTemplateOff: false };
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={i}
              type="button"
              onClick={() => cell.inMonth && onSelectDate(cell.date)}
              disabled={!cell.inMonth}
              title={info.holiday || (info.isTemplateOff ? '定休日（テンプレート）' : undefined)}
              className={`relative aspect-square border rounded text-[10px] cursor-pointer transition-colors flex flex-col items-center justify-center ${
                isSelected ? 'ring-2 ring-amber-400' : ''
              } ${bgColor[info.status] || 'bg-white'} ${cell.inMonth ? 'border-gray-100' : 'border-transparent'}`}
            >
              <div
                className={`${cell.isToday ? 'font-bold text-amber-700' : ''} ${
                  info.holiday && info.status !== 'closed-override' && info.status !== 'closed-template'
                    ? 'text-pink-600'
                    : ''
                } ${cell.dayOfWeek === 0 ? 'text-red-400' : cell.dayOfWeek === 6 ? 'text-blue-400' : ''}`}
              >
                {parseInt(cell.date.split('-')[2], 10)}
              </div>
              {/* Indicator dots */}
              <div className="flex gap-0.5 mt-0.5">
                {cell.inMonth && overrides[cell.date] && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      overrides[cell.date].closed ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                )}
                {cell.inMonth && info.holiday && !overrides[cell.date] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                )}
                {cell.inMonth && info.isTemplateOff && !overrides[cell.date] && !info.holiday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[9px] text-gray-500 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white border border-gray-200" />
          通常
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pink-100 border border-pink-200" />
          祝日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-50 border border-red-200" />
          定休日
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-200" />
          休業（個別）
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-200" />
          変更あり
        </span>
      </div>
    </div>
  );
}
