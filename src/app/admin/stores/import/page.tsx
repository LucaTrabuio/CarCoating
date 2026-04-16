'use client';

import { useRef, useState } from 'react';

type FieldDiff = { field: string; before: unknown; after: unknown };
type PreviewRow = {
  rowNumber: number;
  storeId: string | null;
  action: 'update' | 'create' | 'error' | 'forbidden';
  diff: FieldDiff[];
  errors: string[];
  unknownColumns: string[];
};
type PreviewResponse = {
  summary: { totalRows: number; willUpdate: number; willCreate: number; errors: number; forbidden: number };
  rows: PreviewRow[];
  unknownColumns: string[];
  parseErrors: string[];
};
type CommitResponse = { success: true; importId: string; committed: number; skipped: number };

export default function StoreImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setError(null);
    setSuccess(null);
    if (!f) return;
    await runPreview(f);
  }

  async function runPreview(f: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('mode', 'preview');
      const res = await fetch('/api/admin/stores/import', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Preview failed');
        return;
      }
      setPreview(body as PreviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    const blockers = (preview?.summary.errors ?? 0) + (preview?.summary.forbidden ?? 0);
    if (blockers > 0) {
      setError('Fix or remove rows with errors/forbidden before committing.');
      return;
    }
    if (!confirm(`Commit ${preview?.summary.willUpdate ?? 0} updates and ${preview?.summary.willCreate ?? 0} new stores?`)) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', 'commit');
      const res = await fetch('/api/admin/stores/import', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Commit failed');
        return;
      }
      setSuccess(body as CommitResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setBusy(false);
    }
  }

  function actionBadge(action: PreviewRow['action']) {
    const map: Record<PreviewRow['action'], string> = {
      update: 'bg-blue-100 text-blue-700',
      create: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      forbidden: 'bg-amber-100 text-amber-800',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[action]}`}>{action}</span>;
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-bold mb-2">店舗データ CSV インポート</h1>
      <p className="text-sm text-gray-600 mb-6">
        Excel から CSV を書き出してアップロードすると、一括で店舗情報を更新できます。列が欠落していても既存値は保持されます。
      </p>

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <a
            href="/api/admin/stores/import/template"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-semibold rounded-lg"
          >
            現在の店舗データ（テンプレート）をダウンロード
          </a>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg cursor-pointer">
            CSV をアップロード
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={busy}
            />
          </label>
          {file && (
            <span className="text-sm text-gray-600">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
          {preview && (
            <button
              onClick={reset}
              className="ml-auto px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              disabled={busy}
            >
              やり直す
            </button>
          )}
        </div>
      </div>

      {busy && <div className="text-sm text-gray-500">処理中...</div>}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <div className="font-semibold">インポート完了 ✓</div>
          <div className="text-xs mt-1">
            反映: {success.committed} 件 — Import ID: <code className="bg-white px-1 rounded">{success.importId}</code>
          </div>
          <div className="text-xs mt-1 text-gray-600">
            問題があった場合は「インポート履歴」から元に戻せます（開発中）。
          </div>
        </div>
      )}

      {preview && !success && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {(
              [
                ['更新', preview.summary.willUpdate, 'text-blue-700'],
                ['新規作成', preview.summary.willCreate, 'text-green-700'],
                ['エラー', preview.summary.errors, 'text-red-700'],
                ['権限外', preview.summary.forbidden, 'text-amber-700'],
              ] as const
            ).map(([label, value, cls]) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`text-2xl font-bold ${cls}`}>{value}</div>
              </div>
            ))}
          </div>

          {preview.unknownColumns.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              未知の列（無視されます）: {preview.unknownColumns.join(', ')}
            </div>
          )}

          {preview.parseErrors.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              CSV パースに問題あり:
              <ul className="list-disc pl-5 mt-1">
                {preview.parseErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Row preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2 w-14">行</th>
                  <th className="px-3 py-2">store_id</th>
                  <th className="px-3 py-2 w-24">動作</th>
                  <th className="px-3 py-2">変更</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-t border-gray-100 align-top">
                    <td className="px-3 py-2 text-gray-500">{r.rowNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.storeId ?? '-'}</td>
                    <td className="px-3 py-2">{actionBadge(r.action)}</td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 && (
                        <div className="text-xs text-red-700 mb-1">
                          {r.errors.map((e, i) => <div key={i}>• {e}</div>)}
                        </div>
                      )}
                      {r.diff.length > 0 && (
                        <div className="text-xs text-gray-700 space-y-0.5">
                          {r.diff.slice(0, 5).map((d, i) => (
                            <div key={i}>
                              <span className="font-mono text-gray-500">{d.field}</span>:{' '}
                              <span className="text-gray-400 line-through">{previewValue(d.before)}</span>{' '}
                              →{' '}
                              <span className="text-gray-900">{previewValue(d.after)}</span>
                            </div>
                          ))}
                          {r.diff.length > 5 && (
                            <div className="text-gray-400">…他 {r.diff.length - 5} フィールド</div>
                          )}
                        </div>
                      )}
                      {r.action === 'update' && r.diff.length === 0 && (
                        <div className="text-xs text-gray-400">変更なし</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commit bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <button
              onClick={handleCommit}
              disabled={busy || preview.summary.errors > 0 || preview.summary.forbidden > 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg"
            >
              {busy ? '処理中...' : 'インポートを確定する'}
            </button>
            <div className="text-xs text-gray-500">
              確定前にスナップショットが作成されます。インポート履歴からいつでも元に戻せます。
              <br />
              定期実行（例: 1日1回自動取り込み）への切り替えも可能です — 必要な場合は開発者にご連絡ください。
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return '(空)';
  if (typeof v === 'string') {
    if (v.length === 0) return '(空)';
    return v.length > 40 ? v.slice(0, 40) + '…' : v;
  }
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 40);
  return String(v);
}
