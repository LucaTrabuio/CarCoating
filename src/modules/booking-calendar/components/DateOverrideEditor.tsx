'use client';

import type { DateOverride, WeeklyTemplate, SlotCapacity } from '../types';

export interface DateOverrideEditorProps {
  date: string;
  override: DateOverride;
  holidays: Map<string, string>;
  templateForDay: WeeklyTemplate;
  onSave: (override: DateOverride) => void;
  onDelete: () => void;
  saving: boolean;
  /** Whether this date already has a saved override in Firestore */
  hasExistingOverride: boolean;
  /** Called when override is modified locally (before saving) */
  onOverrideChange: (override: DateOverride) => void;
}

export default function DateOverrideEditor({
  date,
  override,
  holidays,
  templateForDay,
  onSave,
  onDelete,
  saving,
  hasExistingOverride,
  onOverrideChange,
}: DateOverrideEditorProps) {
  function setOverrideCapacity(time: string, capacity: number) {
    const newSlots = { ...override.slotOverrides };
    if (capacity <= 0) delete newSlots[time];
    else newSlots[time] = { capacity };
    onOverrideChange({ ...override, slotOverrides: newSlots });
  }

  function addSlot() {
    const time = prompt('時刻を入力 (例: 18:00)');
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      setOverrideCapacity(time, 2);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{date}</h3>
          {holidays.get(date) && (
            <span className="text-[10px] text-pink-600 font-bold">{holidays.get(date)}</span>
          )}
          {templateForDay?.closed && !hasExistingOverride && (
            <span className="text-[10px] text-red-400 font-bold ml-2">定休日（テンプレート）</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasExistingOverride && (
            <button
              onClick={onDelete}
              className="text-[10px] text-red-500 hover:text-red-700 underline cursor-pointer"
            >
              テンプレートに戻す
            </button>
          )}
          <button
            onClick={() => onSave(override)}
            disabled={saving}
            className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={override.closed}
          onChange={e => onOverrideChange({ ...override, closed: e.target.checked })}
          className="rounded"
        />
        この日を休業にする
      </label>

      {!override.closed && (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {Object.keys(override.slotOverrides || {})
              .sort()
              .map(time => (
                <div key={time} className="border border-gray-200 rounded p-2 text-center">
                  <div className="text-xs font-bold text-[#0f1c2e] mb-1">{time}</div>
                  <input
                    type="number"
                    min={0}
                    value={override.slotOverrides?.[time]?.capacity ?? 0}
                    onChange={e => setOverrideCapacity(time, parseInt(e.target.value) || 0)}
                    className="w-full text-center border border-gray-200 rounded text-xs py-0.5"
                  />
                  <div className="text-[9px] text-gray-400 mt-0.5">枠数</div>
                </div>
              ))}
            <button
              onClick={addSlot}
              className="border-2 border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 cursor-pointer"
            >
              + 追加
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            この日のみの枠数を設定できます。「テンプレートに戻す」で週間テンプレートの設定に戻ります。
          </p>
        </>
      )}

      {!hasExistingOverride && (
        <p className="text-[10px] text-amber-600">
          この日にはまだ個別設定がありません。保存すると週間テンプレートより優先されます。
        </p>
      )}
    </div>
  );
}
