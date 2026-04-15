'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function parseCSVLineSimple(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; } }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; } else if (ch === ',') { result.push(current); current = ''; } else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

/* ─── Main stores page ─── */

export default function StoresPage() {
  return (
    <div className="max-w-[1200px] mx-auto">
      <StoreDataSection />
    </div>
  );
}

/* ─── Store Data Section (Firebase) ─── */

function StoreDataSection() {
  const [v3Stores, setV3Stores] = useState<Record<string, string>[]>([]);
  const [v3Loading, setV3Loading] = useState(false);
  const [v3Message, setV3Message] = useState('');
  const [v3CsvPreview, setV3CsvPreview] = useState<Record<string, string>[]>([]);
  const [v3CsvHeaders, setV3CsvHeaders] = useState<string[]>([]);

  const V3_TEMPLATE_COLUMNS = [
    'store_id','store_name','is_active','address','postal_code','prefecture','city',
    'tel','business_hours','regular_holiday','email','line_url',
    'lat','lng','parking_spaces','landmark','nearby_stations','access_map_url',
    'campaign_title','campaign_deadline','discount_rate','campaign_color_code',
    'hero_title','hero_subtitle','description','meta_description','seo_keywords',
    'hero_image_url','logo_url','staff_photo_url','gallery_images',
    'custom_services','price_multiplier','min_price_limit',
    'has_booth','level1_staff_count','level2_staff_count','google_place_id',
  ];

  useEffect(() => {
    fetchV3Stores();
  }, []);

  async function fetchV3Stores() {
    setV3Loading(true);
    try {
      const res = await fetch('/api/v3/stores?all=true');
      if (res.ok) {
        const data = await res.json();
        setV3Stores(data);
      } else {
        setV3Message('Firebase未設定またはエラー。環境変数を確認してください。');
      }
    } catch {
      setV3Message('Firebase未設定またはエラー。環境変数を確認してください。');
    }
    setV3Loading(false);
  }

  function handleV3TemplateDownload() {
    const bom = '\uFEFF';
    const csv = bom + V3_TEMPLATE_COLUMNS.join(',') + '\n' + V3_TEMPLATE_COLUMNS.map(c => {
      if (c === 'is_active') return 'TRUE';
      if (c === 'discount_rate') return '20';
      if (c === 'price_multiplier') return '1.0';
      if (c === 'lat' || c === 'lng') return '0';
      return '';
    }).join(',');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stores-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleV3Export() {
    try {
      const res = await fetch('/api/v3/stores/export');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'stores-export.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setV3Message('エクスポートに失敗しました');
    }
  }

  function handleV3FileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string).replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setV3Message('CSVにデータがありません'); return; }

      const headers = parseCSVLineSimple(lines[0]);
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLineSimple(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { if (h) row[h.trim()] = (vals[idx] || '').trim(); });
        if (row.store_id && row.store_name) rows.push(row);
      }
      setV3CsvHeaders(headers.filter(h => h));
      setV3CsvPreview(rows);
      setV3Message(`${rows.length}件の店舗データを読み込みました。`);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleV3Import() {
    if (v3CsvPreview.length === 0) return;
    setV3Loading(true);
    try {
      const res = await fetch('/api/v3/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v3CsvPreview),
      });
      if (res.ok) {
        const data = await res.json();
        setV3Message(`✓ ${data.count}件をFirestoreに保存しました`);
        setV3CsvPreview([]);
        setV3CsvHeaders([]);
        fetchV3Stores();
      } else {
        setV3Message('保存に失敗しました');
      }
    } catch {
      setV3Message('保存に失敗しました');
    }
    setV3Loading(false);
  }

  return (
    <div className="space-y-6">
      {/* CSV Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-lg mb-4">店舗データ管理</h2>
        <div className="flex gap-3 flex-wrap mb-4">
          <button onClick={handleV3TemplateDownload}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200">
            CSVテンプレートDL
          </button>
          <button onClick={handleV3Export}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200">
            CSVエクスポート
          </button>
          <label className="px-4 py-2 bg-amber-500 text-[#0C3290] rounded-lg text-sm font-bold cursor-pointer hover:bg-amber-500">
            CSVインポート
            <input type="file" accept=".csv" onChange={handleV3FileSelect} className="hidden" />
          </label>
        </div>

        {v3Message && (
          <p className={`text-sm font-semibold mb-3 ${v3Message.includes('✓') ? 'text-green-600' : v3Message.includes('エラー') || v3Message.includes('失敗') ? 'text-red-600' : 'text-blue-600'}`}>
            {v3Message}
          </p>
        )}

        {/* CSV Preview */}
        {v3CsvPreview.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold mb-2">プレビュー（{v3CsvPreview.length}件）</h3>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {v3CsvHeaders.slice(0, 8).map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold border-b border-gray-200">{h}</th>
                    ))}
                    {v3CsvHeaders.length > 8 && <th className="px-3 py-2 text-gray-400 border-b border-gray-200">+{v3CsvHeaders.length - 8}列</th>}
                  </tr>
                </thead>
                <tbody>
                  {v3CsvPreview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {v3CsvHeaders.slice(0, 8).map(h => (
                        <td key={h} className="px-3 py-1.5 max-w-[150px] truncate">{row[h] || ''}</td>
                      ))}
                      {v3CsvHeaders.length > 8 && <td className="px-3 py-1.5 text-gray-400">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleV3Import} disabled={v3Loading}
              className="mt-3 px-6 py-2.5 bg-amber-500 text-[#0C3290] rounded-lg text-sm font-bold disabled:opacity-50">
              {v3Loading ? '保存中...' : `Firestoreに保存（${v3CsvPreview.length}件）`}
            </button>
          </div>
        )}
      </div>

      {/* Store List — grouped by sub-company */}
      <StoreHierarchy stores={v3Stores as Record<string, unknown>[]} loading={v3Loading} />
    </div>
  );
}

/* ─── Store Hierarchy View ─── */

interface SubCompanyData {
  id: string;
  name: string;
  slug: string;
  stores: string[];
}

function StoreHierarchy({ stores, loading }: { stores: Record<string, unknown>[]; loading: boolean }) {
  const [subCompanies, setSubCompanies] = useState<SubCompanyData[]>([]);

  useEffect(() => {
    fetch('/api/admin/sub-companies')
      .then(r => r.ok ? r.json() : [])
      .then(data => setSubCompanies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Group stores by sub_company_id
  const grouped = new Map<string, Record<string, unknown>[]>();
  const ungrouped: Record<string, unknown>[] = [];

  for (const store of stores) {
    const scId = String(store.sub_company_id || '');
    if (scId) {
      if (!grouped.has(scId)) grouped.set(scId, []);
      grouped.get(scId)!.push(store);
    } else {
      ungrouped.push(store);
    }
  }

  if (loading) return <div className="bg-white border border-gray-200 rounded-xl p-5"><p className="text-sm text-gray-400">読み込み中...</p></div>;
  if (stores.length === 0) return <div className="bg-white border border-gray-200 rounded-xl p-5"><p className="text-sm text-gray-400">店舗データがありません。</p></div>;

  return (
    <div className="space-y-4">
      {/* Sub-company groups */}
      {subCompanies.map(sc => {
        const groupStores = grouped.get(sc.id) || [];
        if (groupStores.length === 0) return null;
        return (
          <div key={sc.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-[#0C3290]">{sc.name}</h2>
                <p className="text-xs text-gray-500">/{sc.slug} — {groupStores.length}店舗（共有サイト）</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/${sc.slug}`} target="_blank" className="text-xs text-amber-500 font-semibold hover:underline">サイトを見る →</Link>
                <Link href={`/admin/builder/${String(groupStores[0]?.store_id)}`} className="text-xs bg-amber-500 text-[#0C3290] px-3 py-1 rounded-lg font-semibold hover:bg-amber-500">ビルダー</Link>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupStores.map(s => (
                <StoreCard key={String(s.store_id)} store={s} companySlug={sc.slug} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped stores */}
      {ungrouped.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-bold text-lg mb-4 text-[#0C3290]">その他の店舗（{ungrouped.length}件）</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ungrouped.map(s => (
              <StoreCard key={String(s.store_id)} store={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreCard({ store: s, companySlug }: { store: Record<string, unknown>; companySlug?: string }) {
  const storeId = String(s.store_id);
  const previewUrl = companySlug ? `/${companySlug}` : `/${storeId}/`;

  return (
    <div className={`border rounded-lg p-4 ${s.is_active === false ? 'bg-gray-50 border-gray-200 opacity-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-sm text-[#0C3290]">{String(s.store_name || '')}</div>
        <div className="flex gap-1">
          {s.is_active === false && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">無効</span>}
          {s.sub_company_id ? <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">グループ</span> : null}
        </div>
      </div>
      <p className="text-xs text-gray-500">{String(s.prefecture || '')} {String(s.city || '')}</p>
      <p className="text-xs text-gray-400 mt-1">{String(s.address || '')}</p>
      {s.discount_rate ? <p className="text-xs text-amber-500 font-semibold mt-1">割引率: {String(s.discount_rate)}%</p> : null}
      <div className="flex gap-2 mt-2">
        <Link href={previewUrl} target="_blank" className="text-xs text-amber-500 font-semibold hover:underline">プレビュー →</Link>
        <Link href={`/admin/builder/${storeId}`} className="text-xs text-blue-600 font-semibold hover:underline">ビルダー →</Link>
      </div>
    </div>
  );
}
