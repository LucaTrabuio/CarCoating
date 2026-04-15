'use client';

import { useState } from 'react';
import type { CustomHtmlConfig } from '@/lib/block-types';

interface CustomHtmlEditorProps {
  config: CustomHtmlConfig;
  onChange: (config: CustomHtmlConfig) => void;
}

export default function CustomHtmlEditor({ config, onChange }: CustomHtmlEditorProps) {
  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [sending, setSending] = useState(false);

  async function requestAdvancedAccess() {
    if (notified || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/custom-html-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlLength: config.html?.length ?? 0, cssLength: config.css?.length ?? 0 }),
      });
      if (res.ok) {
        setNotified(true);
        setNotifying(true);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-bold mb-1">⚠️ セキュリティのご注意</p>
        <p className="mb-2">
          このブロックは自動でサニタイズされます。{' '}
          <code>&lt;script&gt;</code>、インラインイベントハンドラ (<code>onclick</code>等)、
          <code>javascript:</code> URL、<code>iframe</code> は保存時に削除されます。
        </p>
        <p>
          高度なカスタマイズ（埋め込みフォーム・動画・外部スクリプトなど）が必要な場合は、
          サポートへチケットをご提出ください。
        </p>
        <button
          type="button"
          onClick={requestAdvancedAccess}
          disabled={sending || notified}
          className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold disabled:opacity-50 hover:bg-amber-700"
        >
          {notified ? '✓ 通知を送信しました' : sending ? '送信中…' : 'サポートに通知する'}
        </button>
        {notifying && (
          <p className="mt-1 text-[11px]">
            サポートチームにメールを送信しました。追って対応させていただきます。
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">HTML</label>
        <textarea
          value={config.html}
          onChange={(e) => onChange({ ...config, html: e.target.value })}
          rows={10}
          placeholder="<h2>タイトル</h2>\n<p>本文…</p>"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          許可タグ: 見出し・段落・リスト・リンク・画像・表などの基本HTMLのみ
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">CSS</label>
        <textarea
          value={config.css}
          onChange={(e) => onChange({ ...config, css: e.target.value })}
          rows={6}
          placeholder=".custom-html-block h2 { color: #0C3290; }"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          <code>@import</code>、<code>expression()</code>、<code>javascript:</code> URL は削除されます
        </p>
      </div>
    </div>
  );
}
