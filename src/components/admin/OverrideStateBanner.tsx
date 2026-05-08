'use client';

import { useState } from 'react';
import type { DefaultableKey } from '@/lib/global-defaults-shared';

export type OverrideState = 'locked' | 'inheriting' | 'overridden';

export interface OverrideStateBannerProps {
  state: OverrideState;
  sectionLabel: string;
  storeId: string;
  overrideKey: DefaultableKey;
  onReset?: () => void | Promise<void>;
  onCustomize?: () => void;
}

/**
 * Per-section banner shown inside the store builder. Communicates whether the
 * current section is locked by the super admin, inherits the global default,
 * or is overridden by this store. Offers one primary action per state.
 */
export default function OverrideStateBanner({
  state,
  sectionLabel,
  storeId,
  overrideKey,
  onReset,
  onCustomize,
}: OverrideStateBannerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!confirm(`「${sectionLabel}」をグローバルデフォルトに戻しますか？このストアのカスタマイズは失われます。`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/stores/${encodeURIComponent(storeId)}/overrides/${encodeURIComponent(overrideKey)}/reset`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      if (onReset) await onReset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'リセットに失敗しました';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'locked') {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <div className="flex items-center gap-2 font-semibold">
          <span aria-hidden>🔒</span>
          <span>{sectionLabel}はスーパー管理者によりロックされています</span>
        </div>
        <p className="mt-1 text-xs text-red-700/80">
          このセクションはグローバルデフォルトが強制的に適用されます。変更するにはスーパー管理者にご連絡ください。
        </p>
      </div>
    );
  }

  if (state === 'inheriting') {
    return (
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">
              {sectionLabel}はグローバルデフォルトを継承中です
            </div>
            <div className="text-xs text-blue-700/80">
              スーパー管理者がデフォルトを更新すると、このストアにも自動的に反映されます。
            </div>
          </div>
          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              このストア用にカスタマイズ
            </button>
          )}
        </div>
      </div>
    );
  }

  // overridden
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">
            {sectionLabel}はこのストア用にカスタマイズされています
          </div>
          <div className="text-xs text-amber-800/80">
            グローバルデフォルトの変更はこのセクションには反映されません。
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
        >
          {busy ? 'リセット中…' : 'グローバルデフォルトに戻す'}
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
    </div>
  );
}
