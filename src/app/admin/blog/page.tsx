'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  summary?: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  og_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function BlogPage() {
  const admin = useAdminAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  // SEO fields
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('educational');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [showSeo, setShowSeo] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts ?? data ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin.role === 'super_admin') fetchPosts();
  }, [admin.role, fetchPosts]);

  if (admin.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setContent('');
    setPublished(false);
    setSlugManual(false);
    setSummary('');
    setCategory('educational');
    setMetaTitle('');
    setMetaDescription('');
    setOgImageUrl('');
    setShowSeo(false);
  }

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setPublished(post.published);
    setSlugManual(true);
    setSummary(post.summary || '');
    setCategory(post.category || 'educational');
    setMetaTitle(post.metaTitle || '');
    setMetaDescription(post.metaDescription || '');
    setOgImageUrl(post.og_image_url || '');
    if (post.metaTitle || post.metaDescription || post.og_image_url) setShowSeo(true);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      alert('タイトルとスラッグは必須です');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/blog/${editingId}` : '/api/admin/blog';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content,
          published,
          summary: summary || content.slice(0, 200),
          category,
          metaTitle: metaTitle || title,
          metaDescription: metaDescription || content.replace(/\n/g, ' ').slice(0, 160),
          og_image_url: ogImageUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? '保存に失敗しました');
      }
      resetForm();
      fetchPosts();
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この記事を削除しますか？')) return;
    try {
      await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch {
      alert('削除に失敗しました');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ブログ管理</h1>

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">
          {editingId ? '記事を編集' : '新しい記事を作成'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-700">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">スラッグ</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-700">内容</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-700">要約（カード表示用）</label>
            <textarea
              rows={2}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="空欄の場合は本文先頭200文字を使用"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">カテゴリー</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="educational">豆知識</option>
              <option value="comparison">比較</option>
              <option value="seasonal">季節</option>
            </select>
          </div>
        </div>

        {/* SEO section */}
        <details open={showSeo} onToggle={e => setShowSeo((e.target as HTMLDetailsElement).open)}>
          <summary className="text-xs font-bold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            SEO設定 {showSeo ? '▲' : '▼'}
          </summary>
          <div className="mt-3 space-y-3 pl-0">
            <div>
              <label className="mb-1 block text-xs text-gray-600">メタタイトル</label>
              <input
                type="text"
                value={metaTitle}
                onChange={e => setMetaTitle(e.target.value)}
                placeholder={title || 'タイトルから自動生成'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">メタディスクリプション</label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={e => setMetaDescription(e.target.value)}
                placeholder={content ? content.replace(/\n/g, ' ').slice(0, 160) : '本文先頭160文字から自動生成'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">{(metaDescription || content.replace(/\n/g, ' ').slice(0, 160)).length}/160文字</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">OG画像URL</label>
              <input
                type="url"
                value={ogImageUrl}
                onChange={e => setOgImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">SNSシェア時に表示される画像。空欄の場合はデフォルト画像を使用。</p>
            </div>
          </div>
        </details>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          公開する
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>

      {/* Post list */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-900">記事一覧</h2>
        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-500">記事がありません</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <div key={post.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{post.title}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        post.published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {post.published ? '公開' : '下書き'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">/{post.slug}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{post.content}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(post)}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
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
    </div>
  );
}
