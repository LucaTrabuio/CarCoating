'use client';

import type { HeroConfig } from '@/lib/block-types';

interface HeroEditorProps {
  config: HeroConfig;
  onChange: (config: HeroConfig) => void;
}

export default function HeroEditor({ config, onChange }: HeroEditorProps) {
  const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          className={inputClass}
          placeholder="ヒーローバナーのタイトル"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle</label>
        <input
          type="text"
          value={config.subtitle}
          onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
          className={inputClass}
          placeholder="サブタイトル"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
        <input
          type="text"
          value={config.image_url}
          onChange={(e) => onChange({ ...config, image_url: e.target.value })}
          className={inputClass}
          placeholder="https://..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.show_badges}
            onChange={(e) => onChange({ ...config, show_badges: e.target.checked })}
            className="rounded border-gray-300"
          />
          Show Badges
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.show_cta_booking}
            onChange={(e) => onChange({ ...config, show_cta_booking: e.target.checked })}
            className="rounded border-gray-300"
          />
          Show Booking CTA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.show_cta_inquiry}
            onChange={(e) => onChange({ ...config, show_cta_inquiry: e.target.checked })}
            className="rounded border-gray-300"
          />
          Show Inquiry CTA
        </label>
      </div>
    </div>
  );
}
