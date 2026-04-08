'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'store_admin';
  managed_stores: string[];
  disabled: boolean;
}

export default function UsersPage() {
  const admin = useAdminAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'super_admin' | 'store_admin'>('store_admin');
  const [managedStores, setManagedStores] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      setUsers(data.users ?? data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin.role === 'super_admin') fetchUsers();
  }, [admin.role, fetchUsers]);

  if (admin.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-600">アクセス権限がありません</p>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    if (!email || !password) {
      alert('メールアドレスとパスワードは必須です');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          role,
          managed_stores: managedStores
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? '作成に失敗しました');
      }
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('store_admin');
      setManagedStores('');
      fetchUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(uid: string, currentlyDisabled: boolean) {
    const action = currentlyDisabled ? '有効化' : '無効化';
    if (!confirm(`このユーザーを${action}しますか？`)) return;
    try {
      await fetch(`/api/auth/users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });
      fetchUsers();
    } catch {
      alert('更新に失敗しました');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>

      {/* Create form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">新しいユーザーを作成</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700">ロール</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'super_admin' | 'store_admin')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="store_admin">store_admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-gray-700">
              管理店舗 (カンマ区切りの店舗ID)
            </label>
            <input
              type="text"
              value={managedStores}
              onChange={(e) => setManagedStores(e.target.value)}
              placeholder="例: store_001, store_002"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? '作成中...' : 'ユーザーを作成'}
        </button>
      </div>

      {/* User list */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-900">ユーザー一覧</h2>
        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">ユーザーがいません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">メール</th>
                  <th className="pb-2 pr-4">ロール</th>
                  <th className="pb-2 pr-4">管理店舗</th>
                  <th className="pb-2 pr-4">状態</th>
                  <th className="pb-2">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2 pr-4 text-gray-700">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                          u.role === 'super_admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {u.managed_stores?.join(', ') || '-'}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`text-xs ${u.disabled ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {u.disabled ? '無効' : '有効'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDisable(u.uid, u.disabled)}
                        className={`rounded-lg border px-3 py-1 text-xs ${
                          u.disabled
                            ? 'border-green-200 text-green-600 hover:bg-green-50'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {u.disabled ? '有効化' : '無効化'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
