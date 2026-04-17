'use client';

import { useEffect, useState } from 'react';

type ImportMeta = {
  importId: string;
  collection: 'stores' | 'blog_posts';
  createdAt: number;
  createdBy?: string;
  itemCount: number;
  note?: string;
  status: 'snapshotted' | 'committed' | 'restored' | 'failed';
  storageBackupPath?: string;
};

export default function ImportsHistoryPage() {
  const [imports, setImports] = useState<ImportMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/imports/history?limit=20', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) { setError(body.error || 'Failed to load'); return; }
      setImports(body.imports as ImportMeta[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(meta: ImportMeta) {
    const label = meta.collection === 'stores' ? '店舗' : 'ブログ';
    if (!confirm(`このインポートを元に戻します（${meta.itemCount} 件の${label}）。現在のデータは上書きされます。続行しますか？`)) return;
    setRestoringId(meta.importId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/imports/${meta.importId}/restore`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setError(body.error || 'Restore failed'); return; }
      setMessage(`復元完了: ${body.restored} 件を元に戻しました。`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  }

  function statusBadge(status: ImportMeta['status']) {
    const map: Record<ImportMeta['status'], string> = {
      snapshotted: 'bg-gray-100 text-gray-700',
      committed: 'bg-blue-100 text-blue-700',
      restored: 'bg-amber-100 text-amber-800',
      failed: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status]}`}>{status}</span>;
  }

  function collectionBadge(c: ImportMeta['collection']) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
        {c === 'stores' ? '店舗' : 'ブログ'}
      </span>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-bold mb-2">インポート履歴</h1>
      <p className="text-sm text-gray-600 mb-6">
        直近 {imports.length > 0 ? imports.length : 10} 件までの一括インポート記録です。誤ったインポートは「元に戻す」で取り消せます。バックアップ JSON もダウンロードできます。
      </p>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{message}</div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2">日時</th>
              <th className="px-3 py-2">種別</th>
              <th className="px-3 py-2">件数</th>
              <th className="px-3 py-2">メモ</th>
              <th className="px-3 py-2">実行者</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2 w-48">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">読み込み中...</td></tr>
            )}
            {!loading && imports.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">インポート履歴はありません。</td></tr>
            )}
            {imports.map((m) => (
              <tr key={m.importId} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                  {new Date(m.createdAt).toLocaleString('ja-JP')}
                </td>
                <td className="px-3 py-2">{collectionBadge(m.collection)}</td>
                <td className="px-3 py-2 text-gray-700">{m.itemCount}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{m.note || '-'}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{m.createdBy || '-'}</td>
                <td className="px-3 py-2">{statusBadge(m.status)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(m)}
                      disabled={restoringId === m.importId || m.status === 'restored'}
                      className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded font-semibold"
                    >
                      {restoringId === m.importId ? '復元中...' : '元に戻す'}
                    </button>
                    <a
                      href={`/api/admin/imports/${m.importId}/download`}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-semibold"
                    >
                      JSON
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
