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
  notificationOptIn?: boolean;
}

export default function UsersPage() {
  const admin = useAdminAuth();
  const isSuper = admin.role === 'super_admin';

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form (super_admin only)
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'super_admin' | 'store_admin'>('store_admin');
  const [managedStores, setManagedStores] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [allStores, setAllStores] = useState<{ store_id: string; store_name: string }[]>([]);
  const [resetModal, setResetModal] = useState<{ uid: string; email: string } | null>(null);
  const [resetDelivery, setResetDelivery] = useState<'email' | 'shown'>('email');
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [togglingOptIn, setTogglingOptIn] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Use the new scoped endpoint that filters by role
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    if (isSuper) {
      fetch('/api/v3/stores?all=true')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllStores(data.map((s: { store_id: string; store_name: string }) => ({
              store_id: s.store_id,
              store_name: s.store_name,
            })));
          }
        })
        .catch(() => {});
    }
  }, [isSuper, fetchUsers]);

  async function handleCreate() {
    if (!email) {
      alert('メールアドレスは必須です');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, role, managedStores }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? '作成に失敗しました');
      }
      setEmail('');
      setDisplayName('');
      setRole('store_admin');
      setManagedStores([]);
      fetchUsers();
    } catch (e) {
      alert(e instanceof Error ? e.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!resetModal) return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch(`/api/admin/users/${resetModal.uid}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryMode: resetDelivery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '失敗しました');
      if (resetDelivery === 'shown' && data.tempPassword) {
        setResetResult(data.tempPassword);
      } else {
        alert('仮パスワードをメールで送信しました');
        setResetModal(null);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '失敗しました');
    } finally {
      setResetting(false);
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

  async function handleToggleOptIn(u: UserRecord) {
    const isOwnRow = u.uid === admin.uid;
    const endpoint =
      isSuper
        ? `/api/admin/users/${u.uid}/notification-opt-in`
        : `/api/admin/users/me/notification-opt-in`;

    setTogglingOptIn(u.uid);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: !u.notificationOptIn }),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      setUsers(prev =>
        prev.map(x => x.uid === u.uid ? { ...x, notificationOptIn: !u.notificationOptIn } : x)
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setTogglingOptIn(null);
    }
  }

  function canToggleOptIn(u: UserRecord): boolean {
    if (isSuper) return true;
    return u.uid === admin.uid;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        パスワードポリシー: 90日ごとに変更が必要です。新規ユーザーには仮パスワードがメールで送信されます。
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        通知設定をオンにすると、システムアラートと日次レポートをメールで受け取ります。
      </div>

      {/* Create form — super_admin only */}
      {isSuper && (
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
            {role === 'store_admin' && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-700">管理店舗</label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 p-2 space-y-1">
                  {allStores.length === 0 ? (
                    <p className="text-xs text-gray-400 p-1">店舗を読み込み中...</p>
                  ) : (
                    allStores.map(s => (
                      <label key={s.store_id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={managedStores.includes(s.store_id)}
                          onChange={(e) => {
                            if (e.target.checked) setManagedStores(prev => [...prev, s.store_id]);
                            else setManagedStores(prev => prev.filter(id => id !== s.store_id));
                          }}
                          className="rounded"
                        />
                        <span className="text-gray-700">{s.store_name}</span>
                        <span className="text-xs text-gray-400">({s.store_id})</span>
                      </label>
                    ))
                  )}
                </div>
                {managedStores.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{managedStores.length}店舗選択中</p>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {saving ? '作成中...' : 'ユーザーを作成'}
          </button>
        </div>
      )}

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
                  <th className="pb-2 pr-4">通知</th>
                  {isSuper && <th className="pb-2">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const toggleable = canToggleOptIn(u);
                  const isToggling = togglingOptIn === u.uid;
                  return (
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
                        <span className={`text-xs ${u.disabled ? 'text-red-500' : 'text-green-600'}`}>
                          {u.disabled ? '無効' : '有効'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          checked={!!u.notificationOptIn}
                          disabled={!toggleable || isToggling}
                          onChange={() => handleToggleOptIn(u)}
                          title={toggleable ? '通知の受け取り設定' : '変更権限がありません'}
                          className={`rounded ${toggleable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        />
                      </td>
                      {isSuper && (
                        <td className="py-2 flex items-center gap-2">
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
                          <button
                            onClick={() => {
                              setResetModal({ uid: u.uid, email: u.email });
                              setResetResult(null);
                              setResetDelivery('email');
                            }}
                            className="rounded-lg border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50"
                          >
                            PW リセット
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">パスワードリセット</h2>
            <p className="text-sm text-gray-600">{resetModal.email}</p>
            {!resetResult ? (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="deliveryMode"
                      checked={resetDelivery === 'email'}
                      onChange={() => setResetDelivery('email')}
                    />
                    メールで送信
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="deliveryMode"
                      checked={resetDelivery === 'shown'}
                      onChange={() => setResetDelivery('shown')}
                    />
                    画面に表示
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {resetting ? 'リセット中...' : 'リセット実行'}
                  </button>
                  <button
                    onClick={() => setResetModal(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs text-amber-700 mb-1">仮パスワード（一度しか表示されません）</p>
                  <p className="font-mono text-lg font-bold text-amber-900">{resetResult}</p>
                </div>
                <button
                  onClick={() => setResetModal(null)}
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
