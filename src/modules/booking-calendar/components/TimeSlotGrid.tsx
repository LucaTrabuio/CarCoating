'use client';

import type { SlotCapacity } from '../types';

export interface TimeSlotGridProps {
  slots: Record<string, SlotCapacity>;
  onChange: (time: string, capacity: number) => void;
  onAddSlot: () => void;
}

export default function TimeSlotGrid({ slots, onChange, onAddSlot }: TimeSlotGridProps) {
  const sortedTimes = Object.keys(slots).sort();

  return (
    <>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
        {sortedTimes.map(time => (
          <div key={time} className="border border-gray-200 rounded p-2 text-center">
            <div className="text-xs font-bold text-[#0C3290] mb-1">{time}</div>
            <input
              type="number"
              min={0}
              value={slots[time].capacity}
              onChange={e => onChange(time, parseInt(e.target.value) || 0)}
              className="w-full text-center border border-gray-200 rounded text-xs py-0.5"
            />
            <div className="text-[9px] text-gray-400 mt-0.5">枠数</div>
          </div>
        ))}
        <button
          onClick={onAddSlot}
          className="border-2 border-dashed border-gray-300 rounded p-2 text-xs text-gray-400 hover:border-amber-400 hover:text-amber-500 cursor-pointer"
        >
          + 追加
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        枠数 = 同時に予約できる台数。0にすると時間帯が削除されます。
      </p>
    </>
  );
}
