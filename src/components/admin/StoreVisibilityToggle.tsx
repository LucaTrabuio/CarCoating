'use client';

import { useState } from 'react';

interface Props {
  storeId: string;
  initialHideMode: 'manual' | 'seasonal' | null | undefined;
  initialStart: string | undefined;
  initialEnd: string | undefined;
  /** When true, show the MM-DD date inputs for seasonal configuration. */
  showDateEditor: boolean;
}

type HideMode = 'manual' | 'seasonal' | null;

function todayMmDd(): string {
  // Approximate JST on the client (offset shown to user; server enforces actual filter)
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function isWithinWindow(today: string, start: string, end: string): boolean {
  if (start <= end) return today >= start && today <= end;
  return today >= start || today <= end;
}

export function StoreVisibilityToggle({
  storeId,
  initialHideMode,
  initialStart,
  initialEnd,
  showDateEditor,
}: Props) {
  const [hideMode, setHideMode] = useState<HideMode>(initialHideMode ?? null);
  const [start, setStart] = useState(initialStart ?? '');
  const [end, setEnd] = useState(initialEnd ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = todayMmDd();
  const seasonalActive =
    hideMode === 'seasonal' &&
    start &&
    end &&
    isWithinWindow(today, start, end);

  async function patch(payload: Record<string, unknown>) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/v3/stores/${storeId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? '保存に失敗しました');
        return false;
      }
      return true;
    } catch {
      setError('ネットワークエラー');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function toggleManual() {
    const next: HideMode = hideMode === 'manual' ? null : 'manual';
    const prev = hideMode;
    setHideMode(next);
    const ok = await patch({ hide_mode: next });
    if (!ok) setHideMode(prev);
  }

  async function applySeasonal() {
    if (!start || !end) {
      setError('開始・終了の両方を入力してください');
      return;
    }
    const prev = hideMode;
    setHideMode('seasonal');
    const ok = await patch({ hide_mode: 'seasonal', seasonal_hide_start: start, seasonal_hide_end: end });
    if (!ok) setHideMode(prev);
  }

  async function clearSeasonal() {
    const prev = hideMode;
    setHideMode(null);
    setStart('');
    setEnd('');
    const ok = await patch({ hide_mode: null });
    if (!ok) setHideMode(prev);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Manual toggle — disabled while seasonal window is active */}
        <button
          type="button"
          disabled={saving || seasonalActive === true}
          onClick={toggleManual}
          aria-pressed={hideMode === 'manual'}
          className={[
            'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition-colors',
            hideMode === 'manual'
              ? 'bg-amber-400 text-amber-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            seasonalActive ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <span className={`w-3 h-3 rounded-full border ${hideMode === 'manual' ? 'bg-amber-700 border-amber-800' : 'bg-white border-gray-400'}`} />
          {hideMode === 'manual' ? '手動非表示中' : '手動非表示'}
        </button>

        {/* Seasonal status badge */}
        {hideMode === 'seasonal' && (
          seasonalActive
            ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-400 text-amber-900">
                🔒 季節非表示中
              </span>
            )
            : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-gray-100 text-gray-500">
                📅 季節非表示 ({start}〜{end})
              </span>
            )
        )}

        {saving && <span className="text-[10px] text-gray-400">保存中...</span>}
      </div>

      {error && <p className="text-[10px] text-red-600">{error}</p>}

      {/* Seasonal date editor — only shown in /admin/stores */}
      {showDateEditor && (
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <label className="text-[10px] text-gray-500">季節非表示期間:</label>
            <input
              type="text"
              placeholder="MM-DD"
              maxLength={5}
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
            />
            <span className="text-[10px] text-gray-400">〜</span>
            <input
              type="text"
              placeholder="MM-DD"
              maxLength={5}
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-[11px]"
            />
            <button
              type="button"
              disabled={saving}
              onClick={applySeasonal}
              className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-semibold hover:bg-gray-300 disabled:opacity-50"
            >
              設定
            </button>
            {hideMode === 'seasonal' && (
              <button
                type="button"
                disabled={saving}
                onClick={clearSeasonal}
                className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200 disabled:opacity-50"
              >
                解除
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400">
            例: 12-01 〜 03-31（年をまたぐ場合も可）
          </p>
        </div>
      )}
    </div>
  );
}
