'use client';

import { useState, useEffect, useCallback } from 'react';

interface Store {
  store_id: string;
  store_name: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  visible: boolean;
}

const EMPTY_FORM: Omit<NewsItem, 'id'> = {
  title: '',
  content: '',
  date: new Date().toISOString().slice(0, 10),
  visible: true,
};

export default function NewsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Omit<NewsItem, 'id'>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch stores
  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then((r) => r.json())
      .then((data) => setStores(data.stores ?? data ?? []))
      .catch(() => {});
  }, []);

  // Fetch news for selected store
  const fetchNews = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/news`);
      const data = await res.json();
      const items = data.items ?? data.news ?? data;
      setNews(Array.isArray(items) ? items : []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStore) fetchNews(selectedStore);
    else setNews([]);
  }, [selectedStore, fetchNews]);

  function startEdit(item: NewsItem) {
    setEditingId(item.id);
    setForm({ title: item.title, content: item.content, date: item.date, visible: item.visible });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!selectedStore || !form.title.trim()) return;
    setSaving(true);
    try {
      const url = `/api/admin/stores/${selectedStore}/news${editingId ? `/${editingId}` : ''}`;
      const method = editingId ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      cancelEdit();
      await fetchNews(selectedStore);
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このお知らせを削除しますか？')) return;
    try {
      await fetch(`/api/admin/stores/${selectedStore}/news/${id}`, { method: 'DELETE' });
      await fetchNews(selectedStore);
    } catch {
      alert('削除に失敗しました');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">お知らせ管理</h1>

      {/* Store selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-1 block text-sm font-medium text-gray-700">店舗を選択</label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">-- 店舗を選択 --</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.store_name}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      {selectedStore && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900">
            {editingId ? 'お知らせを編集' : '新しいお知らせを追加'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700">タイトル</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700">日付</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">内容</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(e) => setForm({ ...form, visible: e.target.checked })}
            />
            表示する
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>
      )}

      {/* News list */}
      {selectedStore && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">お知らせ一覧</h2>
          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : news.length === 0 ? (
            <p className="text-sm text-gray-500">お知らせがありません</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {news.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      {!item.visible && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          非表示
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{item.date}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
