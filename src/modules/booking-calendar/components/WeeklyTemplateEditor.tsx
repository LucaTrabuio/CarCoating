'use client';

import type { WeeklyTemplate, SlotCapacity } from '../types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// Default time slots (9:00 - 17:30, 30min intervals, no 12:00-12:30 lunch)
const DEFAULT_SLOT_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

function emptyTemplate(): WeeklyTemplate {
  const slots: Record<string, SlotCapacity> = {};
  for (const t of DEFAULT_SLOT_TIMES) {
    slots[t] = { capacity: 2 };
  }
  return { closed: false, slots };
}

export interface WeeklyTemplateEditorProps {
  template: Record<string, WeeklyTemplate>;
  onSave: (day: string, template: WeeklyTemplate) => void;
  saving: string | null;
  /** Called when template is modified locally (before saving) */
  onTemplateChange?: (template: Record<string, WeeklyTemplate>) => void;
  /** Day that was just saved successfully (for showing confirmation) */
  savedDay?: string | null;
}

export default function WeeklyTemplateEditor({
  template,
  onSave,
  saving,
  onTemplateChange,
  savedDay,
}: WeeklyTemplateEditorProps) {
  function updateTemplate(newTemplate: Record<string, WeeklyTemplate>) {
    onTemplateChange?.(newTemplate);
  }

  function toggleClosed(dayOfWeek: string) {
    const newTpl = {
      ...template,
      [dayOfWeek]: { ...template[dayOfWeek], closed: !template[dayOfWeek].closed },
    };
    updateTemplate(newTpl);
  }

  function setCapacity(dayOfWeek: string, time: string, capacity: number) {
    const day = template[dayOfWeek];
    const newSlots = { ...day.slots };
    if (capacity <= 0) {
      delete newSlots[time];
    } else {
      newSlots[time] = { capacity };
    }
    const newTpl = { ...template, [dayOfWeek]: { ...day, slots: newSlots } };
    updateTemplate(newTpl);
  }

  function addSlot(dayOfWeek: string) {
    const time = prompt('時刻を入力 (例: 18:00)');
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return;
    setCapacity(dayOfWeek, time, 2);
  }

  function copyFrom(toDayOfWeek: string, fromDayOfWeek: string) {
    const newTpl = {
      ...template,
      [toDayOfWeek]: { ...template[fromDayOfWeek] },
    };
    updateTemplate(newTpl);
  }

  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map(dayNum => {
        const day = String(dayNum);
        const tpl = template[day] || emptyTemplate();
        const sortedTimes = Object.keys(tpl.slots).sort();

        return (
          <div key={day} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`font-bold text-lg ${
                    dayNum === 0 ? 'text-red-500' : dayNum === 6 ? 'text-blue-500' : 'text-[#0C3290]'
                  }`}
                >
                  {DAY_LABELS[dayNum]}曜日
                </span>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tpl.closed}
                    onChange={() => toggleClosed(day)}
                    className="rounded"
                  />
                  定休日
                </label>
              </div>
              <div className="flex items-center gap-2">
                {dayNum > 0 && !tpl.closed && (
                  <select
                    onChange={e => {
                      if (e.target.value) copyFrom(day, e.target.value);
                      e.target.value = '';
                    }}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                    defaultValue=""
                  >
                    <option value="">他の曜日からコピー</option>
                    {[0, 1, 2, 3, 4, 5, 6]
                      .filter(d => d !== dayNum)
                      .map(d => (
                        <option key={d} value={String(d)}>
                          {DAY_LABELS[d]}曜日から
                        </option>
                      ))}
                  </select>
                )}
                {savedDay === day && (
                  <span className="text-xs text-green-600 font-semibold">&#10003; 保存しました</span>
                )}
                <button
                  onClick={() => onSave(day, tpl)}
                  disabled={saving === day}
                  className="px-4 py-1.5 bg-amber-500 text-[#0C3290] text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                >
                  {saving === day ? '保存中...' : '保存'}
                </button>
              </div>
            </div>

            {!tpl.closed && (
              <>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                  {sortedTimes.map(time => (
                    <div key={time} className="border border-gray-200 rounded p-2 text-center">
                      <div className="text-xs font-bold text-[#0C3290] mb-1">{time}</div>
                      <input
                        type="number"
                        min={0}
                        value={tpl.slots[time].capacity}
                        onChange={e => setCapacity(day, time, parseInt(e.target.value) || 0)}
                        className="w-full text-center border border-gray-200 rounded text-xs py-0.5"
                      />
                      <div className="text-[9px] text-gray-400 mt-0.5">枠数</div>
                    </div>
                  ))}
                  <button
                    onClick={() => addSlot(day)}
                    className="border-2 border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 cursor-pointer"
                  >
                    + 追加
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">
                  枠数 = 同時に予約できる台数。0にすると時間帯が削除されます。
                </p>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
