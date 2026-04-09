'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CarSimulator from '@/components/CarSimulator';
import { CarSize } from '@/lib/types';

export default function HomeSimulatorLink({ storeId, basePath }: { storeId: string; basePath?: string }) {
  const router = useRouter();
  const [selection, setSelection] = useState<{ size: CarSize; make: string; model: string } | null>(null);

  function handleSizeChange(size: CarSize, make: string, model: string) {
    setSelection({ size, make, model });
  }

  function handleNavigate() {
    const params = new URLSearchParams();
    if (selection) {
      params.set('make', selection.make);
      params.set('model', selection.model);
      params.set('size', selection.size);
    }
    const qs = params.toString();
    const base = basePath || `/${storeId}`;
    router.push(`${base}/price${qs ? `?${qs}` : ''}`);
  }

  return (
    <>
      <CarSimulator onSizeChange={handleSizeChange} />
      <button
        onClick={handleNavigate}
        className="inline-block mt-6 px-8 py-3 bg-gradient-to-br from-amber-500 via-amber-400 to-amber-700 text-white font-bold rounded-lg text-base hover:opacity-90 transition-opacity cursor-pointer"
      >
        見積もりシミュレーターへ →
      </button>
    </>
  );
}
