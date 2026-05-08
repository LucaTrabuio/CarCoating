'use client';

import { useMemo } from 'react';
import ImageSlot from '@/app/admin/builder/components/ImageSlot';

export interface PromoBannersEditorProps {
  /** JSON string: `{ src, alt }[]` */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * The 4 large promo banners that appear on the store homepage. Empty src = use
 * the built-in default image. Each of the 4 slots is always kept in `value`
 * so slot positions are preserved across edits.
 */
export default function PromoBannersEditor({ value, onChange, disabled }: PromoBannersEditorProps) {
  const banners = useMemo(() => {
    let parsed: { src: string; alt: string }[] = [];
    try {
      const p = JSON.parse(value || '[]');
      if (Array.isArray(p)) parsed = p;
    } catch { /* fallthrough */ }
    while (parsed.length < 4) parsed.push({ src: '', alt: '' });
    return parsed;
  }, [value]);

  function update(next: { src: string; alt: string }[]) {
    onChange(JSON.stringify(next));
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <h3 className="text-sm font-bold text-gray-800 mb-1">ホームページバナー画像</h3>
      <p className="text-[10px] text-gray-400 mb-3">トップページに表示される大きなバナー画像（4枚）。空欄はデフォルト画像が使用されます。</p>
      <div className="grid grid-cols-2 gap-3">
        {banners.slice(0, 4).map((pb, i) => (
          <ImageSlot
            key={i}
            label={`バナー ${i + 1}`}
            value={pb.src || undefined}
            aspectRatio="16/7"
            onChange={url => {
              const updated = [...banners];
              updated[i] = { src: url, alt: updated[i]?.alt || '' };
              update(updated);
            }}
          />
        ))}
      </div>
    </div>
  );
}
