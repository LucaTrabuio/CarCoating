'use client';

import { useState } from 'react';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

interface PasswordRepromptProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PasswordReprompt({ onSuccess, onCancel }: PasswordRepromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      const res = await fetch('/api/admin/security/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'password' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '認証に失敗しました');
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '認証に失敗しました';
      if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        setError('パスワードが正しくありません');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleReauth() {
    setError('');
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, provider);

      const res = await fetch('/api/admin/security/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'google-recent-auth' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '認証に失敗しました');
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '認証に失敗しました';
      if (!msg.includes('auth/popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-2">本人確認が必要です</h2>
        <p className="text-sm text-gray-600 mb-4">
          顧客情報を表示するにはパスワードを再入力してください。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {loading ? '確認中...' : '確認する'}
          </button>
        </form>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleGoogleReauth}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Googleで再認証する
          </button>
        </div>

        {onCancel && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-500 hover:underline"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
