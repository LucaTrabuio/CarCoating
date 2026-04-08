'use client';

import { useState } from 'react';

interface GenericEditorProps {
  config: Record<string, unknown>;
  onChange: (newConfig: Record<string, unknown>) => void;
}

export default function GenericEditor({ config, onChange }: GenericEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);

  function handleBlur() {
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError('Invalid JSON');
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Block Config (JSON)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={10}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
