'use client';

import { useState, useMemo } from 'react';

interface BookingChoice {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  label: string;
}

interface BookingCalendarProps {
  holidays?: string[]; // days of week: '日', '火', etc.
  businessHours?: string; // e.g., "9:00〜18:00"
  onChoicesChange?: (choices: BookingChoice[]) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
const TIME_SLOTS = [
  '9:00', '9:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export default function BookingCalendar({ holidays = [], onChoicesChange }: BookingCalendarProps) {
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [choices, setChoices] = useState<BookingChoice[]>([]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  function isUnavailable(day: number): boolean {
    const date = new Date(year, month, day);
    if (date < today) return true;
    const dayName = DAY_NAMES[date.getDay()];
    return holidays.includes(dayName);
  }

  function isSunday(day: number): boolean {
    return new Date(year, month, day).getDay() === 0;
  }

  function isSaturday(day: number): boolean {
    return new Date(year, month, day).getDay() === 6;
  }

  function getChoiceRank(day: number): number {
    const dateStr = formatDate(day);
    const idx = choices.findIndex(c => c.date === dateStr);
    return idx >= 0 ? idx + 1 : 0;
  }

  function formatDate(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function formatLabel(day: number, time: string): string {
    const date = new Date(year, month, day);
    return `${month + 1}月${day}日（${DAY_NAMES[date.getDay()]}）${time}〜`;
  }

  function handleDateClick(day: number) {
    if (isUnavailable(day)) return;
    setSelectedDate(formatDate(day));
    setSelectedTime(null);
  }

  function handleTimeClick(time: string) {
    if (!selectedDate || choices.length >= 3) return;
    const day = parseInt(selectedDate.split('-')[2]);
    const newChoice: BookingChoice = {
      date: selectedDate,
      time,
      label: formatLabel(day, time),
    };
    const next = [...choices, newChoice];
    setChoices(next);
    onChoicesChange?.(next);
    setSelectedTime(time);
  }

  function removeChoice(idx: number) {
    const next = choices.filter((_, i) => i !== idx);
    setChoices(next);
    onChoicesChange?.(next);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div>
      {/* Calendar header */}
      <div className="flex justify-between items-center mb-3">
        <button onClick={prevMonth} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">← 前月</button>
        <span className="font-bold text-base">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">翌月 →</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d === '日' ? 'text-red-500' : d === '土' ? 'text-blue-500' : 'text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const unavailable = isUnavailable(day);
          const rank = getChoiceRank(day);
          const isSelected = selectedDate === formatDate(day);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={unavailable}
              className={`relative aspect-square flex items-center justify-center text-sm rounded-md border-2 transition-all
                ${unavailable ? 'text-gray-300 bg-gray-50 border-transparent cursor-not-allowed' :
                  rank === 1 ? 'bg-amber-500 text-[#0C3290] border-amber-700 font-bold' :
                  rank === 2 ? 'bg-amber-100 text-amber-800 border-amber-500 font-bold' :
                  rank === 3 ? 'bg-amber-50 text-amber-700 border-amber-400 font-bold opacity-70' :
                  isSelected ? 'bg-blue-50 border-blue-400' :
                  'border-transparent hover:bg-amber-50 cursor-pointer'}
                ${isSunday(day) && !unavailable ? 'text-red-500' : ''}
                ${isSaturday(day) && !unavailable ? 'text-blue-500' : ''}
              `}
            >
              {day}
              {rank > 0 && <span className="absolute text-[8px] -mt-5 font-bold">{rank}</span>}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-3 text-[10px] text-gray-500">
        <span><span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded mr-1" />第1希望</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-amber-100 border border-amber-500 rounded mr-1" />第2・3希望</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-gray-200 rounded mr-1" />選択不可</span>
      </div>

      {/* Time slots (shown when date selected) */}
      {selectedDate && choices.length < 3 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-2">
            {selectedDate.split('-')[1]}月{selectedDate.split('-')[2]}日の時間帯を選択
          </h3>
          <p className="text-xs text-gray-400 mb-3">30分間隔 ｜ 空いている枠をタップ</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_SLOTS.map(time => {
              const alreadyChosen = choices.some(c => c.date === selectedDate && c.time === time);
              return (
                <button
                  key={time}
                  onClick={() => handleTimeClick(time)}
                  disabled={alreadyChosen}
                  className={`py-2.5 text-center text-xs font-semibold rounded-lg border transition-all
                    ${alreadyChosen ? 'bg-amber-500 text-[#0C3290] border-amber-500' :
                      'border-gray-200 hover:border-amber-500 hover:bg-amber-50 cursor-pointer'}
                  `}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Choices summary */}
      {choices.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-3">選択した希望日時</h3>
          <div className="space-y-2">
            {choices.map((choice, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
                  ${idx === 0 ? 'bg-amber-500 text-[#0C3290]' : idx === 1 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                  {idx + 1}
                </div>
                <span className="text-sm">{choice.label}</span>
                <button onClick={() => removeChoice(idx)} className="ml-auto text-gray-400 text-xs hover:text-red-500">✕ 取消</button>
              </div>
            ))}
          </div>
          {choices.length < 3 && (
            <p className="text-xs text-gray-400 mt-2">あと{3 - choices.length}つ選択できます</p>
          )}
        </div>
      )}
    </div>
  );
}
