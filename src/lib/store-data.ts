import { StoreData } from './types';
import { stores as storeDataArray } from '@/data/stores';

export function getAllStores(): StoreData[] {
  return storeDataArray;
}

export async function getAllStoresAsync(baseUrl?: string): Promise<StoreData[]> {
  try {
    const url = baseUrl ? `${baseUrl}/api/stores` : '/api/stores';
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) return res.json();
  } catch (e) {
    console.error('Failed to fetch stores from API:', e);
  }
  return storeDataArray;
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

// Client-side CSV parsing for admin upload
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

export function parseCSVClient(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    return row;
  });
}
