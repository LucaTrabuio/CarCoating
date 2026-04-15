'use client';

import type { BannersConfig, Banner } from '@/lib/block-types';
import ImageUploadField from '../ImageUploadField';

interface BannersEditorProps {
  config: BannersConfig;
  onChange: (config: BannersConfig) => void;
}

export default function BannersEditor({ config, onChange }: BannersEditorProps) {
  const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

  function updateBanner(index: number, patch: Partial<Banner>) {
    const banners = config.banners.map((b, i) =>
      i === index ? { ...b, ...patch } : b
    );
    onChange({ ...config, banners });
  }

  function addBanner() {
    const newBanner: Banner = {
      id: String(Date.now()),
      template_id: '',
      custom_css: '',
      title: '',
      subtitle: '',
      image_url: '',
      original_price: 0,
      discount_rate: 0,
      link_url: '',
      visible: true,
    };
    onChange({ ...config, banners: [...config.banners, newBanner] });
  }

  function removeBanner(index: number) {
    onChange({ ...config, banners: config.banners.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      {config.banners.map((banner, index) => (
        <div key={banner.id} className="border border-gray-200 rounded p-2 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Banner {index + 1}</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={banner.visible}
                  onChange={(e) => updateBanner(index, { visible: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Visible
              </label>
              <button
                onClick={() => removeBanner(index)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Title</label>
            <input
              type="text"
              value={banner.title}
              onChange={(e) => updateBanner(index, { title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Subtitle</label>
            <input
              type="text"
              value={banner.subtitle}
              onChange={(e) => updateBanner(index, { subtitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <ImageUploadField
            label="Image"
            value={banner.image_url}
            onChange={(url) => updateBanner(index, { image_url: url })}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Original Price</label>
              <input
                type="number"
                value={banner.original_price}
                onChange={(e) => updateBanner(index, { original_price: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Discount Rate (%)</label>
              <input
                type="number"
                value={banner.discount_rate}
                onChange={(e) => updateBanner(index, { discount_rate: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Link URL</label>
            <input
              type="text"
              value={banner.link_url}
              onChange={(e) => updateBanner(index, { link_url: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>
      ))}
      <button
        onClick={addBanner}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + Add Banner
      </button>
    </div>
  );
}
