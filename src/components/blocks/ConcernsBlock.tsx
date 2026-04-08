'use client';

import { useState } from 'react';
import type { ConcernsConfig } from '@/lib/block-types';

interface ConcernsBlockProps {
  config: ConcernsConfig;
}

export default function ConcernsBlock({ config }: ConcernsBlockProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!config.items || config.items.length === 0) return null;

  function toggle(id: string) {
    setOpenId(prev => (prev === id ? null : id));
  }

  return (
    <section className="py-14 px-5 bg-white">
      <div className="max-w-[800px] mx-auto">
        <h2 className="text-[#0f1c2e] text-xl md:text-2xl font-bold text-center mb-8" style={{ fontFamily: '"Noto Serif JP", serif' }}>
          {'\u3088\u304F\u3042\u308B\u3054\u8CEA\u554F'}
        </h2>
        <div className="space-y-3">
          {config.items.map(item => (
            <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <span className="text-[#0f1c2e] text-sm font-semibold">{item.question}</span>
                <span className="text-slate-400 text-lg ml-3 flex-shrink-0">
                  {openId === item.id ? '\u2212' : '+'}
                </span>
              </button>
              {openId === item.id && (
                <div className="px-5 pb-4">
                  <p className="text-slate-500 text-sm leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
