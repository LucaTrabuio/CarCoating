'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { validatePassword } from '@/lib/password-policy';

interface PasswordChangeFormProps {
  flow: 'forced' | 'voluntary';
}

export function PasswordChangeForm({ flow }: PasswordChangeFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('ログインが必要です');

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password via Firebase SDK
      await updatePassword(user, newPassword);

      // Notify server to update flags and send confirmation email
      const res = await fetch('/api/admin/users/me/password-changed', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('password-changed server hook failed:', data.error);
      }

      setSuccess(true);

      if (flow === 'forced') {
        setTimeout(() => router.push('/admin'), 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        setError('現在のパスワードが正しくありません');
      } else if (msg.includes('auth/requires-recent-login')) {
        setError('再ログインが必要です。一度ログアウトしてください。');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <div className="text-green-600 text-3xl mb-2">✓</div>
        <p className="text-green-800 font-semibold">パスワードを変更しました</p>
        {flow === 'forced' && <p className="text-sm text-green-700 mt-1">管理画面に移動します...</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
        <p className="text-xs text-gray-500 mt-1">8文字以上、大文字・小文字・数字・記号を含む</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50"
      >
        {loading ? '変更中...' : 'パスワードを変更する'}
      </button>
    </form>
  );
}
