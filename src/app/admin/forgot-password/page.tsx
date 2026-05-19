'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/admin/security/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C3290] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">パスワードのリセット</h1>
          <p className="text-gray-400 mt-2">登録メールアドレスを入力してください</p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-xl">
          {submitted ? (
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✉</div>
              <p className="text-sm text-gray-700">
                ご入力のメールアドレスにアカウントが存在する場合、リセット手順をお送りします。
              </p>
              <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
                ログインに戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  placeholder="admin@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#0C3290] font-bold rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? '送信中...' : 'リセットリンクを送信'}
              </button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:underline">
                  ログインに戻る
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
