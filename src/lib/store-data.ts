import { StoreData } from './types';
import fs from 'fs';
import path from 'path';

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

function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function rowToStore(row: Record<string, string>): StoreData {
  return {
    store_id: row.store_id || '',
    store_name: row.store_name || '',
    address: row.address || '',
    postal_code: row.postal_code || '',
    prefecture: row.prefecture || '',
    city: row.city || '',
    tel: row.tel || '',
    business_hours: row.business_hours || '',
    regular_holiday: row.regular_holiday || 'なし',
    access_map_url: row.access_map_url || '',
    lat: parseFloat(row.lat) || 0,
    lng: parseFloat(row.lng) || 0,
    has_booth: row.has_booth === 'true',
    level1_staff_count: parseInt(row.level1_staff_count) || 0,
    level2_staff_count: parseInt(row.level2_staff_count) || 0,
    seo_keywords: row.seo_keywords || '',
    meta_description: row.meta_description || '',
    campaign_title: row.campaign_title || '',
    campaign_deadline: row.campaign_deadline || '',
    discount_rate: parseInt(row.discount_rate) || 20,
    campaign_color_code: row.campaign_color_code || '',
    min_price_limit: parseInt(row.min_price_limit) || 14560,
    google_place_id: row.google_place_id || '',
    line_url: row.line_url || '',
    parking_spaces: parseInt(row.parking_spaces) || 0,
    landmark: row.landmark || '',
    nearby_stations: row.nearby_stations || '[]',
  };
}

let cachedStores: StoreData[] | null = null;

export function getAllStores(): StoreData[] {
  if (cachedStores) return cachedStores;

  const csvPath = path.join(process.cwd(), 'src', 'data', 'sample-stores.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  cachedStores = rows.map(rowToStore);
  return cachedStores;
}

export function getStoreById(storeId: string): StoreData | undefined {
  return getAllStores().find(s => s.store_id === storeId);
}

export function getAllStoreIds(): string[] {
  return getAllStores().map(s => s.store_id);
}

export function getDefaultCampaign(): { title: string; color: string; deadline: string } {
  return {
    title: 'Web予約限定キャンペーン',
    color: '#c49a2a',
    deadline: '2026-04-30',
  };
}

export function getStoreCampaign(store: StoreData) {
  const defaults = getDefaultCampaign();
  return {
    title: store.campaign_title || defaults.title,
    color: store.campaign_color_code || defaults.color,
    deadline: store.campaign_deadline || defaults.deadline,
    discount_rate: store.discount_rate,
  };
}

export function getNearbyStations(store: StoreData): { name: string; time: string }[] {
  try {
    return JSON.parse(store.nearby_stations);
  } catch {
    return [];
  }
}

// For client-side CSV parsing (admin upload)
export function parseCSVClient(csvContent: string): Record<string, string>[] {
  return parseCSV(csvContent);
}
