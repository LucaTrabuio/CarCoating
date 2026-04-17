'use client';

import type { StaffBlockConfig, StaffMember } from '@/lib/block-types';
import ImageUploadField from '../ImageUploadField';

interface StaffEditorProps {
  config: StaffBlockConfig;
  onChange: (config: StaffBlockConfig) => void;
}

export default function StaffEditor({ config, onChange }: StaffEditorProps) {
  const inputClass = 'w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400';

  function updateMember(index: number, patch: Partial<StaffMember>) {
    const members = config.members.map((m, i) => (i === index ? { ...m, ...patch } : m));
    onChange({ ...config, members });
  }

  function addMember() {
    const newMember: StaffMember = {
      id: String(Date.now()),
      name: '',
      role: '',
      photo_url: '',
      bio: '',
      certifications: '',
    };
    onChange({ ...config, members: [...config.members, newMember] });
  }

  function removeMember(index: number) {
    onChange({ ...config, members: config.members.filter((_, i) => i !== index) });
  }

  function moveMember(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= config.members.length) return;
    const members = [...config.members];
    [members[index], members[target]] = [members[target], members[index]];
    onChange({ ...config, members });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Heading</label>
        <input
          type="text"
          value={config.heading}
          onChange={(e) => onChange({ ...config, heading: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Subheading</label>
        <input
          type="text"
          value={config.subheading}
          onChange={(e) => onChange({ ...config, subheading: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="space-y-3">
        {config.members.map((m, index) => (
          <div key={m.id} className="border border-gray-200 rounded p-2 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Staff {index + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveMember(index, -1)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveMember(index, 1)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  disabled={index === config.members.length - 1}
                >
                  ↓
                </button>
                <button
                  onClick={() => removeMember(index)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>

            <ImageUploadField
              label="Photo"
              value={m.photo_url}
              onChange={(url) => updateMember(index, { photo_url: url })}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Name</label>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Role</label>
                <input
                  type="text"
                  value={m.role}
                  onChange={(e) => updateMember(index, { role: e.target.value })}
                  className={inputClass}
                  placeholder="店長 / 1級コーティング技能士"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Certifications (badge)</label>
              <input
                type="text"
                value={m.certifications}
                onChange={(e) => updateMember(index, { certifications: e.target.value })}
                className={inputClass}
                placeholder="1級 / 2級"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Bio</label>
              <textarea
                value={m.bio}
                onChange={(e) => updateMember(index, { bio: e.target.value })}
                className={`${inputClass} min-h-[60px]`}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addMember}
        className="w-full py-1.5 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
      >
        + Add Staff
      </button>
    </div>
  );
}
