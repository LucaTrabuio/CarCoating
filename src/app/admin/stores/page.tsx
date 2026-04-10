'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StoreData } from '@/lib/types';
import { stores as hardcodedStores } from '@/data/stores';

/* ─── CSV helpers ─── */

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return { headers: [], rows: [] };
  const rawHeaders = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
  const validIndices = rawHeaders.map((h, i) => h ? i : -1).filter(i => i >= 0);
  const headers = validIndices.map(i => rawHeaders[i]);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    validIndices.forEach((origIdx, newIdx) => { row[headers[newIdx]] = values[origIdx] || ''; });
    return row;
  });
  return { headers, rows };
}

function csvRowToStore(row: Record<string, string>): StoreData {
  return {
    store_id: row.store_id || '',
    store_name: row.store_name || '',
    address: row.address || '',
    postal_code: row.postal_code || '',
    prefecture: row.prefecture || '',
    city: row.city || '',
    tel: row.tel || '',
    business_hours: row.business_hours || '',
    regular_holiday: row.regular_holiday || '',
    access_map_url: row.access_map_url || '',
    lat: parseFloat(row.lat) || 0,
    lng: parseFloat(row.lng) || 0,
    has_booth: row.has_booth?.toUpperCase() === 'TRUE',
    level1_staff_count: parseInt(row.level1_staff_count) || 0,
    level2_staff_count: parseInt(row.level2_staff_count) || 0,
    seo_keywords: row.seo_keywords || '',
    meta_description: row.meta_description || '',
    campaign_title: row.campaign_title || '',
    campaign_deadline: row.campaign_deadline || '',
    discount_rate: parseInt(row.discount_rate) || 0,
    campaign_color_code: row.campaign_color_code || '#c49a2a',
    min_price_limit: parseInt(row.min_price_limit) || 0,
    google_place_id: row.google_place_id || '',
    line_url: row.line_url || '',
    email: row.email || '',
    parking_spaces: parseInt(row.parking_spaces) || 0,
    landmark: row.landmark || '',
    nearby_stations: row.nearby_stations || '[]',
  };
}

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

/* ─── Constants ─── */

const STORE_FIELDS: { key: keyof StoreData; label: string; required: boolean }[] = [
  { key: 'store_id', label: '店舗ID', required: true },
  { key: 'store_name', label: '店舗名', required: true },
  { key: 'address', label: '住所', required: true },
  { key: 'postal_code', label: '〒', required: false },
  { key: 'prefecture', label: '都道府県', required: true },
  { key: 'city', label: '市区町村', required: true },
  { key: 'tel', label: '電話番号', required: false },
  { key: 'business_hours', label: '営業時間', required: false },
  { key: 'regular_holiday', label: '定休日', required: false },
  { key: 'discount_rate', label: '割引率', required: false },
  { key: 'campaign_title', label: 'キャンペーン', required: false },
  { key: 'email', label: 'メール', required: false },
];

const CSV_ALL_HEADERS = [
  'store_id', 'store_name', 'address', 'postal_code', 'prefecture', 'city',
  'tel', 'business_hours', 'regular_holiday', 'access_map_url', 'lat', 'lng',
  'has_booth', 'level1_staff_count', 'level2_staff_count',
  'seo_keywords', 'meta_description',
  'campaign_title', 'campaign_deadline', 'discount_rate', 'campaign_color_code', 'min_price_limit',
  'google_place_id', 'line_url', 'email', 'parking_spaces', 'landmark', 'nearby_stations'
];

/* ─── Main stores page ─── */

export default function StoresPage() {
  const [activeSection, setActiveSection] = useState<'legacy' | 'v3'>('legacy');

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Section toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSection('legacy')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeSection === 'legacy' ? 'bg-amber-500 text-black' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          店舗マスターCSV管理
        </button>
        <button
          onClick={() => setActiveSection('v3')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeSection === 'v3' ? 'bg-amber-500 text-black' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          V3 Firebase管理
        </button>
      </div>

      {activeSection === 'legacy' ? <LegacyStoresSection /> : <V3FirebaseSection />}
    </div>
  );
}

/* ─── Legacy Stores Section ─── */

function LegacyStoresSection() {
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [savedStores, setSavedStores] = useState<StoreData[]>(() => {
    const localStores: StoreData[] = [];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_stores');
      if (saved) localStores.push(...JSON.parse(saved));
    }
    const mergedMap = new Map<string, StoreData>();
    hardcodedStores.forEach(s => mergedMap.set(s.store_id, s));
    localStores.forEach(s => mergedMap.set(s.store_id, s));
    return Array.from(mergedMap.values());
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  function handleCSVTemplateDownload() {
    const example = [
      'tokyo-shinjuku', 'KeePer PRO SHOP 新宿高島屋店', '東京都新宿区千駄ヶ谷5-24-2', '151-0051', '東京都', '新宿区',
      '03-1234-5678', '9:00〜18:00', '年中無休', '', '35.6896', '139.7006',
      'TRUE', '2', '1',
      'コーティング 新宿', 'KeePer PRO SHOP 新宿店',
      '春の新生活キャンペーン', '2026-04-30', '20', '#c49a2a', '14560',
      'ChIJ...', 'https://line.me/...', 'store@example.com', '3', '高島屋タイムズスクエア隣', '"[{""name"":""新宿駅"",""time"":""徒歩5分""}]"'
    ];
    const csv = CSV_ALL_HEADERS.join(',') + '\n' + example.join(',');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCsvFileName(file.name);
    setSaveSuccess(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      const errors: string[] = [];
      if (!headers.includes('store_id')) errors.push('store_id カラムが見つかりません');
      if (!headers.includes('store_name')) errors.push('store_name カラムが見つかりません');
      rows.forEach((row, i) => {
        if (!row.store_id) errors.push(`行 ${i + 2}: store_id が空です`);
        if (!row.store_name) errors.push(`行 ${i + 2}: store_name が空です`);
      });

      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  }

  async function handleCSVSave() {
    const importedStores = csvRows.map(csvRowToStore).filter(s => s.store_id);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedStores),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setCsvErrors(prev => [...prev, `サーバー保存エラー: ${err.error || res.statusText}（ローカルには保存済み）`]);
      }
    } catch {
      setCsvErrors(prev => [...prev, 'サーバーに接続できません（ローカルには保存済み）']);
    }
    localStorage.setItem('admin_stores', JSON.stringify(importedStores));
    const mergedMap = new Map<string, StoreData>();
    hardcodedStores.forEach(s => mergedMap.set(s.store_id, s));
    importedStores.forEach(s => mergedMap.set(s.store_id, s));
    setSavedStores(Array.from(mergedMap.values()));
    setSaveSuccess(true);
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvFileName('');
  }

  function handleCSVCancel() {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvErrors([]);
    setCsvFileName('');
  }

  function handleExportCSV() {
    const rows = savedStores.map(store =>
      CSV_ALL_HEADERS.map(h => {
        const val = String(store[h as keyof StoreData] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );
    const csv = CSV_ALL_HEADERS.join(',') + '\n' + rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stores_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">店舗マスターCSV管理</h2>
          <div className="flex gap-2">
            <button onClick={handleCSVTemplateDownload} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50">📋 テンプレート</button>
            <button onClick={handleExportCSV} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50">📤 CSVエクスポート</button>
            <label className="px-3 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90">
              📥 CSVインポート
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
        </div>

        {csvRows.length > 0 ? (
          <div>
            <p className="text-xs text-green-600 font-semibold mb-1">✓ {csvFileName} を読み込みました（{csvRows.length}店舗）</p>

            {csvErrors.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">エラー:</p>
                {csvErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto mb-3">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {STORE_FIELDS.map(f => (
                      <th key={f.key} className="px-2 py-1.5 text-left font-semibold border-b border-gray-200 whitespace-nowrap">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, ri) => (
                    <tr key={ri} className="border-b border-gray-100">
                      {STORE_FIELDS.map(f => (
                        <td key={f.key} className="px-2 py-1.5 whitespace-nowrap max-w-[150px] truncate">
                          {row[f.key] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {csvHeaders.length > STORE_FIELDS.length && (
              <p className="text-xs text-gray-400 mb-3">+ {csvHeaders.length - STORE_FIELDS.length}カラム（{csvHeaders.filter(h => !STORE_FIELDS.find(f => f.key === h)).join(', ')}）</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCSVSave}
                disabled={csvErrors.some(e => e.includes('store_id カラム'))}
                className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold disabled:opacity-40"
              >
                保存して反映する（{csvRows.length}店舗）
              </button>
              <button onClick={handleCSVCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">キャンセル</button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-2">CSVファイルをアップロードして店舗データを一括更新</p>
            <p className="text-gray-300 text-xs">📋 テンプレートをダウンロードして記入してください</p>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 font-semibold">✓ {savedStores.length}店舗のデータを保存しました</p>
            <p className="text-xs text-green-600 mt-1">※ この変更はブラウザのローカルストレージに保存されています。本番反映するにはデプロイが必要です。</p>
          </div>
        )}
      </div>

      {/* Saved stores display */}
      {savedStores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-sm mb-3">保存済み店舗データ（{savedStores.length}件）</h3>
          <div className="grid gap-3">
            {savedStores.map(store => (
              <div key={store.store_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-sm">{store.store_name}</div>
                  <div className="text-xs text-gray-500">{store.store_id} ｜ {store.prefecture} {store.city} ｜ {store.tel || '電話未設定'}</div>
                </div>
                <div className="flex items-center gap-2">
                  {store.has_booth && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">ブース</span>}
                  {store.discount_rate > 0 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">{store.discount_rate}%OFF</span>}
                  <Link href={`/${store.store_id}`} className="text-xs text-amber-500 font-semibold hover:underline">プレビュー →</Link>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { localStorage.removeItem('admin_stores'); setSavedStores([...hardcodedStores]); setSaveSuccess(false); }}
            className="mt-3 text-xs text-red-500 hover:text-red-700"
          >
            保存データをクリア
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── V3 Firebase Section ─── */

function V3FirebaseSection() {
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
    a.href = url; a.download = 'v3-stores-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleV3Export() {
    try {
      const res = await fetch('/api/v3/stores/export');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'v3-stores-export.csv'; a.click();
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
        <h2 className="font-bold text-lg mb-4">V3 店舗データ管理（Firebase）</h2>
        <div className="flex gap-3 flex-wrap mb-4">
          <button onClick={handleV3TemplateDownload}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200">
            CSVテンプレートDL
          </button>
          <button onClick={handleV3Export}
            className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200">
            CSVエクスポート
          </button>
          <label className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold cursor-pointer hover:bg-amber-500">
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
              className="mt-3 px-6 py-2.5 bg-amber-500 text-black rounded-lg text-sm font-bold disabled:opacity-50">
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
                <Link href={`/admin/builder/${String(groupStores[0]?.store_id)}`} className="text-xs bg-amber-500 text-black px-3 py-1 rounded-lg font-semibold hover:bg-amber-500">ビルダー</Link>
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
