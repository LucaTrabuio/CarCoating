'use client';

import { useMemo, useState } from 'react';
import {
  KEEPER_FIELD_MAP_MANIFEST,
  SAMPLE_SURVEY_ANSWERS,
  mapSurveyAnswersToStore,
  mapSurveyAnswersToExtras,
  type KeeperFieldMapEntry,
  type KeeperMapStatus,
} from '@/lib/keeper-field-map';

// Status → badge styling + Japanese label. UI copy, inline per CLAUDE.md §1.
const STATUS_META: Record<KeeperMapStatus, { label: string; className: string }> = {
  direct: { label: '直結', className: 'bg-green-100 text-green-800' },
  transformed: { label: '変換', className: 'bg-blue-100 text-blue-800' },
  derived: { label: '導出', className: 'bg-purple-100 text-purple-800' },
  extras: { label: '別枠', className: 'bg-amber-100 text-amber-800' },
  unmapped: { label: '未対応', className: 'bg-orange-100 text-orange-700' },
  'no-source': { label: 'ソース無し', className: 'bg-gray-100 text-gray-600' },
};

// JSON-string store fields whose preview value should be parsed for display.
const JSON_FIELDS = new Set([
  'nearby_stations',
  'gallery_images',
  'staff_members',
  'certifications',
]);

export default function KeeperFieldMapView() {
  const { store, extras } = useMemo(
    () => ({
      store: mapSurveyAnswersToStore(SAMPLE_SURVEY_ANSWERS) as Record<string, unknown>,
      extras: mapSurveyAnswersToExtras(SAMPLE_SURVEY_ANSWERS),
    }),
    [],
  );

  const connected = KEEPER_FIELD_MAP_MANIFEST.filter((e) =>
    e.status === 'direct' || e.status === 'transformed' || e.status === 'derived',
  );
  const extrasEntries = KEEPER_FIELD_MAP_MANIFEST.filter((e) => e.status === 'extras');
  const notConnected = KEEPER_FIELD_MAP_MANIFEST.filter((e) =>
    e.status === 'unmapped' || e.status === 'no-source',
  );

  const counts = {
    connected: connected.length,
    extras: extrasEntries.length,
    notConnected: notConnected.length,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-base font-bold text-gray-900">
          サーベイ項目 → ストア項目 マッピング
        </h2>
        <p className="text-sm text-gray-500">
          KeePer 店舗サーベイの各回答が、店舗データのどのフィールドに、どのように
          反映されるかの一覧です。下部にサンプル回答を使ったプレビューを表示します。
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
            接続済み {counts.connected}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
            別枠取得 {counts.extras}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
            未接続 {counts.notConnected}
          </span>
        </div>
      </header>

      {/* Connected */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          ✅ 接続済み（ストア項目へ反映）
        </h3>
        <MappingTable entries={connected} showTarget />
      </section>

      {/* Extras */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          🟡 別枠で取得（専用カラムが無く extras に保持）
        </h3>
        <p className="mb-2 text-xs text-gray-500">
          サーベイには存在するが店舗データの単一カラムに対応しない項目。CMS
          ブロック等での活用を想定し、移行時に <code>extras</code> として保持されます。
        </p>
        <MappingTable entries={extrasEntries} showTarget />
      </section>

      {/* Not connected */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          ⚪ 未接続
        </h3>
        <p className="mb-2 text-xs text-gray-500">
          サーベイにあるが現状取り込まない項目（未対応）と、サーベイに入力元が
          無い店舗フィールド（ソース無し）。
        </p>
        <MappingTable entries={notConnected} showTarget />
      </section>

      {/* Live sample preview */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          🔎 サンプルプレビュー
        </h3>
        <p className="text-xs text-gray-500">
          サンプル回答（横浜店）を実際の変換関数に通した結果です。コードと同じ
          ロジックで生成しています。
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SampleInputPanel />
          <SampleOutputPanel store={store} extras={extras} />
        </div>
      </section>
    </div>
  );
}

function MappingTable({
  entries,
  showTarget,
}: {
  entries: KeeperFieldMapEntry[];
  showTarget: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <th className="px-3 py-2">サーベイ項目</th>
            <th className="px-3 py-2">キー</th>
            {showTarget && <th className="px-3 py-2">ストア項目</th>}
            <th className="px-3 py-2">変換方法</th>
            <th className="px-3 py-2 text-center">区分</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const meta = STATUS_META[e.status];
            return (
              <tr key={`${e.survey}-${e.target}-${i}`} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-800">
                  {e.surveyLabel}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-400">
                  {e.survey || '—'}
                </td>
                {showTarget && (
                  <td className="px-3 py-2 text-gray-700">
                    <span>{e.targetLabel}</span>
                    {e.target && (
                      <span className="ml-1 font-mono text-xs text-gray-400">
                        ({e.target})
                      </span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-xs text-gray-600">{e.how}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                    {meta.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SampleInputPanel() {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(SAMPLE_SURVEY_ANSWERS);
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
        サーベイ回答（サンプル）
      </div>
      <dl className="divide-y divide-gray-50">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2 px-3 py-1.5 text-xs">
            <dt className="min-w-[140px] shrink-0 font-mono text-gray-400">{key}</dt>
            <dd className="break-all text-gray-700">{summarizeValue(value)}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full border-t border-gray-100 px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
      >
        {open ? '生JSONを隠す ▲' : '生JSONを表示 ▼'}
      </button>
      {open && (
        <pre className="max-h-80 overflow-auto bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-700">
          {JSON.stringify(SAMPLE_SURVEY_ANSWERS, null, 2)}
        </pre>
      )}
    </div>
  );
}

function SampleOutputPanel({
  store,
  extras,
}: {
  store: Record<string, unknown>;
  extras: ReturnType<typeof mapSurveyAnswersToExtras>;
}) {
  const storeEntries = Object.entries(store);
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/30">
      <div className="border-b border-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">
        生成されるストア項目（{storeEntries.length} フィールド）
      </div>
      <dl className="divide-y divide-blue-50">
        {storeEntries.map(([key, value]) => (
          <div key={key} className="px-3 py-1.5 text-xs">
            <dt className="font-mono text-gray-400">{key}</dt>
            <dd className="mt-0.5 break-all text-gray-800">
              {renderStoreValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-blue-100 px-3 py-2 text-xs font-semibold text-amber-700">
        extras（別枠・専用カラム無し）
      </div>
      <dl className="divide-y divide-amber-50">
        {Object.entries(extras)
          .filter(([, v]) => !isEmptyExtra(v))
          .map(([key, value]) => (
            <div key={key} className="px-3 py-1.5 text-xs">
              <dt className="font-mono text-gray-400">{key}</dt>
              <dd className="mt-0.5 break-all text-gray-800">{summarizeValue(value)}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

// ─── value rendering helpers ─────────────────────────────────

function summarizeValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join('、');
  }
  return JSON.stringify(value);
}

function isEmptyExtra(v: unknown): boolean {
  if (v == null || v === '' || v === 0) return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Pretty-render a store field value; JSON-string fields are parsed for readability. */
function renderStoreValue(key: string, value: unknown) {
  if (typeof value === 'string' && JSON_FIELDS.has(key)) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return (
        <pre className="overflow-x-auto rounded bg-white/70 p-2 text-[11px] leading-relaxed text-gray-700">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      /* fall through to plain rendering */
    }
  }
  return <span>{summarizeValue(value)}</span>;
}
