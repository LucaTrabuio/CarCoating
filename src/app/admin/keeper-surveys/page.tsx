'use client';

import { useState, useCallback, useEffect } from 'react';
import type { KeeperSurveyDoc, KeeperResponseDoc } from '@/lib/keeper-types';

type SyncResult = {
  ok: boolean;
  surveys?: number;
  responses?: number;
  filesMirrored?: number;
  unmatched?: number;
  error?: string;
};

export default function KeeperSurveysPage() {
  const [surveys, setSurveys] = useState<KeeperSurveyDoc[] | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<KeeperSurveyDoc | null>(null);
  const [responses, setResponses] = useState<KeeperResponseDoc[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/keeper-surveys');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { surveys: KeeperSurveyDoc[] };
      setSurveys(data.surveys);
    } catch (e) {
      setError('アンケート一覧の取得に失敗しました');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResponses = useCallback(async (survey: KeeperSurveyDoc) => {
    setSelectedSurvey(survey);
    setResponses(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/keeper-surveys/${encodeURIComponent(survey.survey_id)}/responses`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { responses: KeeperResponseDoc[] };
      setResponses(data.responses);
    } catch (e) {
      setError('回答一覧の取得に失敗しました');
      console.error(e);
    }
  }, []);

  const handleSync = useCallback(async (full = false) => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/keeper-surveys/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full }),
      });
      const data = (await res.json()) as SyncResult;
      setSyncResult(data);
      if (data.ok) {
        await loadSurveys();
      }
    } catch (e) {
      setError('同期に失敗しました');
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }, [loadSurveys]);

  // Load surveys on mount
  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">KeePer アンケート連携</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? '同期中...' : '今すぐ同期'}
          </button>
          <button
            type="button"
            onClick={() => handleSync(true)}
            disabled={syncing}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            フル同期
          </button>
        </div>
      </div>

      {syncResult && (
        <div
          className={`rounded-md p-4 text-sm ${syncResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
        >
          {syncResult.ok ? (
            <span>
              同期完了 — アンケート: {syncResult.surveys ?? 0}件、回答: {syncResult.responses ?? 0}件、
              ファイル: {syncResult.filesMirrored ?? 0}件、未リンク: {syncResult.unmatched ?? 0}件
            </span>
          ) : (
            <span>同期エラー: {syncResult.error}</span>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Survey list */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">アンケート一覧</h2>
          {loading && (
            <p className="text-sm text-gray-500">読み込み中...</p>
          )}
          {!loading && surveys?.length === 0 && (
            <p className="text-sm text-gray-500">
              アンケートがありません。同期を実行してください。
            </p>
          )}
          {surveys && surveys.length > 0 && (
            <ul className="space-y-2">
              {surveys.map((survey) => (
                <li key={survey.survey_id}>
                  <button
                    type="button"
                    onClick={() => loadResponses(survey)}
                    className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                      selectedSurvey?.survey_id === survey.survey_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 line-clamp-2">
                      {survey.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={survey.status} />
                      <span className="text-xs text-gray-500">
                        {survey.response_count}件の回答
                      </span>
                    </div>
                    {survey.updated_at && (
                      <div className="mt-1 text-xs text-gray-400">
                        更新: {new Date(survey.updated_at).toLocaleDateString('ja-JP')}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Responses */}
        <div className="lg:col-span-2">
          {selectedSurvey && (
            <>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                回答一覧 — {selectedSurvey.title}
              </h2>
              {responses === null && (
                <p className="text-sm text-gray-500">読み込み中...</p>
              )}
              {responses?.length === 0 && (
                <p className="text-sm text-gray-500">回答がありません。</p>
              )}
              {responses && responses.length > 0 && (
                <div className="space-y-4">
                  {responses.map((resp) => (
                    <ResponseCard
                      key={resp.response_id}
                      surveyId={selectedSurvey.survey_id}
                      response={resp}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {!selectedSurvey && !loading && surveys && surveys.length > 0 && (
            <p className="text-sm text-gray-500">
              左のアンケートを選択すると回答が表示されます。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    published: { label: '公開中', className: 'bg-green-100 text-green-800' },
    draft: { label: '下書き', className: 'bg-gray-100 text-gray-600' },
    closed: { label: '終了', className: 'bg-red-100 text-red-700' },
  };
  const entry = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${entry.className}`}>
      {entry.label}
    </span>
  );
}

function ResponseCard({
  surveyId,
  response,
}: {
  surveyId: string;
  response: KeeperResponseDoc;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {response.store_name ?? '(店舗名なし)'}
            </span>
            <MatchBadge status={response.matchStatus} />
          </div>
          {response.submitted_at && (
            <div className="mt-0.5 text-xs text-gray-400">
              提出日時: {new Date(response.submitted_at).toLocaleString('ja-JP')}
            </div>
          )}
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4">
          {/* Answer summary — plain text only, no dangerouslySetInnerHTML */}
          <AnswerSummary answers={response.answers} />

          {/* Thumbnail images via file-proxy route */}
          {response.files && response.files.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-gray-600">添付ファイル</div>
              <div className="flex flex-wrap gap-2">
                {response.files.map((f) => (
                  <FileThumb
                    key={f.file_id}
                    surveyId={surveyId}
                    responseId={response.response_id}
                    fileId={f.file_id}
                    filename={f.filename}
                    contentType={f.content_type}
                    mirrored={!!f.mirrored}
                  />
                ))}
              </div>
            </div>
          )}

          {response.matchedStoreId && (
            <div className="mt-2 text-xs text-gray-500">
              リンク先店舗 ID: {response.matchedStoreId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchBadge({ status }: { status: string }) {
  if (status === 'matched') {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
        リンク済
      </span>
    );
  }
  return (
    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      未リンク
    </span>
  );
}

function AnswerSummary({ answers }: { answers: Record<string, unknown> }) {
  const entries = Object.entries(answers);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600">回答内容</div>
      <dl className="space-y-1">
        {entries.slice(0, 10).map(([key, value]) => (
          <div key={key} className="flex gap-2 text-xs text-gray-700">
            <dt className="min-w-[120px] shrink-0 font-medium text-gray-500">{key}</dt>
            <dd className="break-all">
              {typeof value === 'string'
                ? value
                : Array.isArray(value)
                  ? value
                      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
                      .join(', ')
                  : JSON.stringify(value)}
            </dd>
          </div>
        ))}
        {entries.length > 10 && (
          <div className="text-xs text-gray-400">
            …他 {entries.length - 10} 項目
          </div>
        )}
      </dl>
    </div>
  );
}

function FileThumb({
  surveyId,
  responseId,
  fileId,
  filename,
  contentType,
  mirrored,
}: {
  surveyId: string;
  responseId: string;
  fileId: string;
  filename: string | null;
  contentType: string | null;
  mirrored: boolean;
}) {
  const proxyUrl = `/api/admin/keeper-surveys/${encodeURIComponent(surveyId)}/files/${encodeURIComponent(fileId)}?responseId=${encodeURIComponent(responseId)}`;
  const isImage = contentType?.startsWith('image/') ?? false;

  if (!mirrored) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
        未取得
      </div>
    );
  }

  if (isImage) {
    return (
      <a
        href={proxyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxyUrl}
          alt={filename ?? 'ファイル'}
          className="h-16 w-16 rounded border border-gray-200 object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={proxyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-16 w-16 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs text-blue-600 hover:bg-blue-50"
    >
      {filename ? filename.slice(0, 10) : 'ファイル'}
    </a>
  );
}
