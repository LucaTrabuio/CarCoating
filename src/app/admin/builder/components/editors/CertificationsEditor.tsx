'use client';

import type { CertificationsConfig, Certification } from '@/lib/block-types';

interface CertificationsEditorProps {
  config: CertificationsConfig;
  onChange: (config: CertificationsConfig) => void;
}

export default function CertificationsEditor({ config, onChange }: CertificationsEditorProps) {
  const inputClass = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

  function updateCert(index: number, patch: Partial<Certification>) {
    const certs = config.certs.map((cert, i) =>
      i === index ? { ...cert, ...patch } : cert
    );
    onChange({ ...config, certs });
  }

  function addCert() {
    const newCert: Certification = {
      id: String(Date.now()),
      title: '',
      subtitle: '',
      image_url: '',
    };
    onChange({ ...config, certs: [...config.certs, newCert] });
  }

  function removeCert(index: number) {
    onChange({ ...config, certs: config.certs.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3">
      {config.certs.map((cert, index) => (
        <div key={cert.id} className="border border-gray-200 rounded p-2 space-y-2 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Certification {index + 1}</span>
            <button
              onClick={() => removeCert(index)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Title (H2)</label>
            <input
              type="text"
              value={cert.title}
              onChange={(e) => updateCert(index, { title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Subtitle (H3)</label>
            <input
              type="text"
              value={cert.subtitle}
              onChange={(e) => updateCert(index, { subtitle: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Image URL</label>
            <input
              type="text"
              value={cert.image_url}
              onChange={(e) => updateCert(index, { image_url: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>
      ))}
      <button
        onClick={addCert}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + Add Certification
      </button>
    </div>
  );
}
