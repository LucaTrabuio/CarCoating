'use client';

import { useState, useRef } from 'react';

interface ImageSlotProps {
  value: string | undefined;
  onChange: (url: string) => void;
  label?: string;
  aspectRatio?: string;
}

export default function ImageSlot({ value, onChange, label, aspectRatio = '16/9' }: ImageSlotProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div>
      {label && <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>}
      <div
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-colors ${
          value ? 'border-gray-200 hover:border-blue-300' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
        }`}
        style={{ aspectRatio }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-lg">変更</span>
            </div>
            <button
              onClick={handleClear}
              className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center hover:bg-red-600 z-10"
            >
              ×
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {uploading ? (
              <span className="text-xs">アップロード中...</span>
            ) : (
              <>
                <span className="text-2xl mb-1">+</span>
                <span className="text-[10px]">クリックして画像を選択</span>
              </>
            )}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} className="hidden" />
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
