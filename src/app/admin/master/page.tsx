'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface AppealPoint {
  id: string;
  icon: string;
  label: string;
  description: string;
}

function newAppealPoint(): AppealPoint {
  return { id: crypto.randomUUID(), icon: '', label: '', description: '' };
}

export default function MasterPage() {
  const admin = useAdminAuth();
  const [appealPoints, setAppealPoints] = useState<AppealPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAppealPoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/appeal-points');
      const data = await res.json();
      setAppealPoints(data.items ?? data ?? []);
    } catch {
      setAppealPoints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin.role === 'super_admin') fetchAppealPoints();
  }, [admin.role, fetchAppealPoints]);

  if (admin.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  function updatePoint(id: string, field: keyof AppealPoint, value: string) {
    setAppealPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function addPoint() {
    setAppealPoints((prev) => [...prev, newAppealPoint()]);
  }

  function removePoint(id: string) {
    setAppealPoints((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/master/appeal-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: appealPoints }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      alert('保存しました');
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">マスターデータ管理</h1>

      {/* Appeal Points */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">アピールポイント</h2>
          <button
            onClick={addPoint}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + 追加
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : appealPoints.length === 0 ? (
          <p className="text-sm text-gray-500">
            アピールポイントがありません。「追加」をクリックして作成してください。
          </p>
        ) : (
          <div className="space-y-3">
            {appealPoints.map((point, idx) => (
              <div
                key={point.id}
                className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
              >
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600">
                  {idx + 1}
                </span>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">アイコン</label>
                    <input
                      type="text"
                      value={point.icon}
                      onChange={(e) => updatePoint(point.id, 'icon', e.target.value)}
                      placeholder="例: shield, star"
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">ラベル</label>
                    <input
                      type="text"
                      value={point.label}
                      onChange={(e) => updatePoint(point.id, 'label', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">説明</label>
                    <input
                      type="text"
                      value={point.description}
                      onChange={(e) => updatePoint(point.id, 'description', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removePoint(point.id)}
                  className="mt-5 shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Banner Templates (placeholder) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">バナーテンプレート</h2>
        <p className="mt-2 text-sm text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}
