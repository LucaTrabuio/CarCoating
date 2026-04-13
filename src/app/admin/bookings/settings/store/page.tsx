'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/components/admin/AdminAuthProvider';

interface Store {
  store_id: string;
  store_name: string;
}

interface StoreSettings {
  calendarId: string;
  notificationEmails: string[];
}

export default function StoreSettingsPage() {
  const user = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [settings, setSettings] = useState<StoreSettings>({ calendarId: '', notificationEmails: [] });
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  // Load stores
  useEffect(() => {
    fetch('/api/v3/stores?all=true')
      .then(r => r.json())
      .then(data => {
        let list: Store[] = Array.isArray(data) ? data : [];
        if (user.role === 'store_admin') {
          list = list.filter(s => user.managed_stores.includes(s.store_id));
        }
        setStores(list);
        if (list.length === 1) setSelectedStore(list[0].store_id);
      })
      .catch(() => {});
  }, [user]);

  const loadSettings = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store-settings?store=${storeId}`);
      const data = await res.json();
      setSettings({
        calendarId: data.calendarId || '',
        notificationEmails: data.notificationEmails || [],
      });
    } catch {
      setSettings({ calendarId: '', notificationEmails: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedStore) loadSettings(selectedStore);
  }, [selectedStore, loadSettings]);

  function addEmail() {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) return;
    if (settings.notificationEmails.includes(email)) return;
    setSettings(prev => ({ ...prev, notificationEmails: [...prev.notificationEmails, email] }));
    setEmailInput('');
  }

  function removeEmail(email: string) {
    setSettings(prev => ({
      ...prev,
      notificationEmails: prev.notificationEmails.filter(e => e !== email),
    }));
  }

  async function handleSave() {
    if (!selectedStore) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          ...(user.role === 'super_admin' ? { calendarId: settings.calendarId } : {}),
          notificationEmails: settings.notificationEmails,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('保存に失敗しました');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">店舗予約設定</h1>
          <p className="text-xs text-gray-500 mt-1">通知メール・Google Calendar IDの設定</p>
        </div>
        <Link href="/admin/bookings/settings" className="text-xs text-gray-500 hover:text-amber-600">← 時間枠設定</Link>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">店舗を選択</option>
          {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
        </select>
      </div>

      {!selectedStore && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          店舗を選択してください
        </div>
      )}

      {selectedStore && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {/* Notification emails */}
          <div>
            <label className="block text-sm font-bold text-[#0C3290] mb-1">通知メールアドレス</label>
            <p className="text-xs text-gray-500 mb-3">新しい予約があったときに通知を受け取るメールアドレスです。複数設定できます。</p>

            <div className="space-y-2 mb-3">
              {settings.notificationEmails.length === 0 && (
                <p className="text-xs text-gray-400 italic">まだ設定されていません</p>
              )}
              {settings.notificationEmails.map(email => (
                <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                placeholder="example@example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={addEmail}
                className="px-4 py-2 bg-amber-500 text-[#0C3290] text-sm font-bold rounded-lg hover:bg-amber-600 cursor-pointer"
              >
                追加
              </button>
            </div>
          </div>

          {/* Calendar ID (super_admin only) */}
          {user.role === 'super_admin' && (
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-[#0C3290] mb-1">Google Calendar ID</label>
              <p className="text-xs text-gray-500 mb-2">確定した予約はこのカレンダーに自動で追加されます。（スーパー管理者のみ設定可）</p>
              <input
                type="text"
                value={settings.calendarId}
                onChange={e => setSettings(prev => ({ ...prev, calendarId: e.target.value }))}
                placeholder="xxx@group.calendar.google.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          )}

          {/* Calendar invite */}
          {settings.calendarId && (
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-[#0C3290] mb-1">Googleカレンダー招待</label>
              <p className="text-xs text-gray-500 mb-2">メールアドレスを入力すると、店舗の予約カレンダーに閲覧権限で招待します。</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteResult(null); }}
                  placeholder="you@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={async () => {
                    if (!inviteEmail.includes('@') || !selectedStore) return;
                    setInviting(true);
                    setInviteResult(null);
                    try {
                      const res = await fetch('/api/admin/store-settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storeId: selectedStore, action: 'invite', email: inviteEmail }),
                      });
                      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
                      setInviteResult('✓ 招待を送信しました');
                      setInviteEmail('');
                    } catch (err) {
                      setInviteResult('✗ ' + (err instanceof Error ? err.message : '送信失敗'));
                    }
                    setInviting(false);
                  }}
                  disabled={inviting || !inviteEmail.includes('@')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {inviting ? '送信中...' : '招待を送信'}
                </button>
              </div>
              {inviteResult && (
                <p className={`text-xs mt-1 ${inviteResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{inviteResult}</p>
              )}
            </div>
          )}

          {/* Save */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {saved && <span className="text-xs text-green-600 font-semibold">✓ 保存しました</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto px-6 py-2 bg-amber-500 text-[#0C3290] text-sm font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
