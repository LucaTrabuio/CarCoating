'use client';

import { useState, useEffect, useCallback } from 'react';

type CheckStatus = 'ok' | 'warn' | 'error' | 'info';

interface CheckItem {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
}

interface Check {
  label: string;
  status: CheckStatus;
  value?: string;
  detail?: string;
  items?: CheckItem[];
}

interface Section {
  title: string;
  checks: Check[];
}

interface DiagnosticsResponse {
  sections?: Section[];
  generatedAt?: string;
  error?: string;
  detail?: string;
}

const STATUS_STYLE: Record<CheckStatus, { icon: string; color: string; bg: string; border: string }> = {
  ok: { icon: '✓', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  warn: { icon: '⚠', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  error: { icon: '✗', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  info: { icon: '•', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

export function DiagnosticsClient() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/diagnostics', { cache: 'no-store' });
      const json: DiagnosticsResponse = await res.json();
      if (!res.ok) {
        setError(json.error ? `${json.error}${json.detail ? ': ' + json.detail : ''}` : `HTTP ${res.status}`);
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDiagnostics(); }, [fetchDiagnostics]);

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const summary = (() => {
    if (!data?.sections) return null;
    let ok = 0, warn = 0, err = 0;
    for (const section of data.sections) {
      for (const check of section.checks) {
        if (check.status === 'ok') ok++;
        else if (check.status === 'warn') warn++;
        else if (check.status === 'error') err++;
      }
    }
    return { ok, warn, err };
  })();

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">診断</h1>
          {data?.generatedAt && (
            <div className="text-[10px] text-gray-400 mt-0.5">
              取得: {new Date(data.generatedAt).toLocaleString('ja-JP')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {summary && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-700">✓ {summary.ok}</span>
              <span className="text-amber-700">⚠ {summary.warn}</span>
              <span className="text-red-700">✗ {summary.err}</span>
            </div>
          )}
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="text-xs text-amber-600 hover:text-amber-700 border border-amber-300 rounded px-3 py-2 hover:bg-amber-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? '...' : '再取得'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <div className="font-bold mb-1">読み込みエラー</div>
          <div className="font-mono text-xs break-all">{error}</div>
        </div>
      )}

      {loading && !data && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      )}

      {data?.sections?.map((section, si) => (
        <div key={si} className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">{section.title}</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {section.checks.map((check, ci) => {
              const style = STATUS_STYLE[check.status];
              const key = `${si}:${ci}`;
              const isExpanded = expanded.has(key);
              const hasItems = check.items && check.items.length > 0;
              const expandable = hasItems;

              return (
                <div
                  key={ci}
                  className={`border rounded-lg ${style.bg} ${style.border} ${expandable ? 'md:col-span-2' : ''}`}
                >
                  <div
                    className={`px-3 py-2 flex items-start gap-2 ${expandable ? 'cursor-pointer hover:brightness-95' : ''}`}
                    onClick={expandable ? () => toggleExpand(key) : undefined}
                  >
                    <span className={`text-sm font-bold ${style.color} shrink-0 w-4 text-center`}>{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-gray-700 truncate">{check.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {check.value && (
                            <span className={`text-xs font-mono font-bold ${style.color}`}>{check.value}</span>
                          )}
                          {expandable && (
                            <span className={`text-[10px] ${style.color}`}>{isExpanded ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </div>
                      {check.detail && (
                        <div className="text-[10px] text-gray-500 font-mono mt-1 break-all">{check.detail}</div>
                      )}
                    </div>
                  </div>
                  {expandable && isExpanded && check.items && (
                    <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
                      <ul className="text-xs">
                        {check.items.map((item, ii) => (
                          <li
                            key={ii}
                            className="px-3 py-1.5 border-b border-gray-100 last:border-b-0 flex items-center justify-between gap-3 hover:bg-white/50"
                          >
                            <span className="text-gray-800 truncate flex-1 min-w-0">{item.label}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.sublabel && (
                                <span className="text-[10px] text-gray-400 font-mono">{item.sublabel}</span>
                              )}
                              {item.href && (
                                <a
                                  href={item.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-mono"
                                >
                                  開く ↗
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
