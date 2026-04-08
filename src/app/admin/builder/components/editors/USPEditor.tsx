'use client';

import type { USPConfig, USPItem } from '@/lib/block-types';

interface USPEditorProps {
  config: USPConfig;
  onChange: (config: USPConfig) => void;
}

export default function USPEditor({ config, onChange }: USPEditorProps) {
  const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

  function updateItem(index: number, patch: Partial<USPItem>) {
    const items = config.items.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    onChange({ ...config, items });
  }

  function addItem() {
    const newItem: USPItem = {
      id: String(Date.now()),
      icon: '',
      title: '',
      description: '',
    };
    onChange({ ...config, items: [...config.items, newItem] });
  }

  function removeItem(index: number) {
    onChange({ ...config, items: config.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      {config.items.map((item, index) => (
        <div key={item.id} className="border border-gray-200 rounded p-2 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Item {index + 1}</span>
            <button
              onClick={() => removeItem(index)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Icon</label>
              <input
                type="text"
                value={item.icon}
                onChange={(e) => updateItem(index, { icon: e.target.value })}
                className={inputClass}
                placeholder="emoji"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Title</label>
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Description</label>
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + Add Item
      </button>
    </div>
  );
}
