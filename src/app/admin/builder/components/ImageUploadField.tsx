'use client';

import { useState, useRef } from 'react';

interface ImageUploadFieldProps {
  value: string | undefined;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export default function ImageUploadField({ value, onChange, label, placeholder = 'https://...' }: ImageUploadFieldProps) {
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

  return (
    <div>
      {label && <label className="block text-xs text-gray-500 mb-0.5">{label}</label>}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded text-xs font-semibold hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? '...' : '📷'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} className="hidden" />
      </div>
      {value && (
        <img src={value} alt="" className="mt-1.5 h-12 rounded border border-gray-200 object-cover" />
      )}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
