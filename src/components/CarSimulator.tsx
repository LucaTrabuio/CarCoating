'use client';

import { useState } from 'react';
import { carDatabase, getUniqueMakes, getModelsByMake, findCarSize } from '@/data/car-database';
import { CarSize } from '@/lib/types';
import { sizeLabels } from '@/lib/pricing';

interface CarSimulatorProps {
  onSizeChange?: (size: CarSize, make: string, model: string) => void;
  compact?: boolean;
}

export default function CarSimulator({ onSizeChange, compact = false }: CarSimulatorProps) {
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [detectedSize, setDetectedSize] = useState<CarSize | null>(null);

  const makes = getUniqueMakes();
  const models = selectedMake ? getModelsByMake(selectedMake) : [];

  function handleMakeChange(make: string) {
    setSelectedMake(make);
    setSelectedModel('');
    setDetectedSize(null);
  }

  function handleModelChange(model: string) {
    setSelectedModel(model);
    const car = findCarSize(selectedMake, model);
    if (car) {
      setDetectedSize(car.size);
      onSizeChange?.(car.size, selectedMake, model);
    }
  }

  return (
    <div className={compact ? '' : 'max-w-[600px] mx-auto'}>
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-400 mb-1">メーカー</label>
          <select
            value={selectedMake}
            onChange={e => handleMakeChange(e.target.value)}
            className="w-full px-3.5 py-3 text-base rounded-lg border-2 border-gray-200 bg-white focus:border-amber-600 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">選択してください</option>
            {makes.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-gray-400 mb-1">車種</label>
          <select
            value={selectedModel}
            onChange={e => handleModelChange(e.target.value)}
            className="w-full px-3.5 py-3 text-base rounded-lg border-2 border-gray-200 bg-white focus:border-amber-600 focus:outline-none appearance-none cursor-pointer"
            disabled={!selectedMake}
          >
            <option value="">{selectedMake ? '車種を選択' : 'メーカーを先に選択'}</option>
            {models.map(m => (
              <option key={m.model} value={m.model}>{m.model}</option>
            ))}
          </select>
        </div>
      </div>

      {detectedSize && (
        <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-500 rounded-lg text-center">
          <span className="text-xs text-gray-500">判定結果</span>
          <div className="mt-1">
            <span className="text-gray-700">{selectedMake} {selectedModel} = </span>
            <span className="text-2xl font-bold text-amber-700">{detectedSize}サイズ</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{sizeLabels[detectedSize]}</p>
        </div>
      )}
    </div>
  );
}
