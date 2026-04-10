/**
 * Master data access layer.
 * Reads from Firestore master_data collection first, falls back to hardcoded defaults.
 * Use these functions in Server Components / route handlers (not client components).
 */

import { getAdminDb } from './firebase-admin';
import { coatingTiers as hardcodedTiers } from '@/data/coating-tiers';
import type { CoatingTier } from './types';

export interface MasterAppealPoint {
  id: string;
  icon: string;
  label: string;
  description: string;
}

// Default appeal points — same as the hardcoded ones in AppealPointsBlock
const DEFAULT_APPEAL_POINTS: Record<string, MasterAppealPoint> = {
  booth: { id: 'booth', label: 'コーティング専用ブース完備', icon: '🏢', description: '天候に左右されない専用施工環境' },
  certified: { id: 'certified', label: '技術認定スタッフ在籍', icon: '👨‍🔧', description: 'KeePer技術資格保有のプロが対応' },
  warranty: { id: 'warranty', label: '施工保証付き', icon: '🛡️', description: '安心の施工品質保証' },
  quick: { id: 'quick', label: '即日施工対応', icon: '⏱️', description: '当日のご予約にも可能な限り対応' },
  shuttle: { id: 'shuttle', label: '送迎サービスあり', icon: '🚗', description: '施工中のお待ち時間に送迎サービス' },
  loaner: { id: 'loaner', label: '代車無料', icon: '🔑', description: '施工中は無料で代車をご利用いただけます' },
  card: { id: 'card', label: 'カード・電子マネー対応', icon: '💳', description: '各種お支払い方法に対応' },
  weekend: { id: 'weekend', label: '土日祝日営業', icon: '📅', description: 'お仕事帰りや休日にもご来店いただけます' },
};

/** Get appeal points as a lookup map. Firestore first, hardcoded fallback. */
export async function getMasterAppealPoints(): Promise<Record<string, MasterAppealPoint>> {
  try {
    const doc = await getAdminDb().collection('master_data').doc('appeal_points').get();
    if (doc.exists) {
      const items = doc.data()?.items as MasterAppealPoint[] | undefined;
      if (items && Array.isArray(items) && items.length > 0) {
        const map: Record<string, MasterAppealPoint> = {};
        items.forEach(p => { map[p.id] = p; });
        return map;
      }
    }
  } catch { /* fallback */ }
  return DEFAULT_APPEAL_POINTS;
}

/** Get coating tiers. Firestore first, hardcoded fallback. */
export async function getMasterCoatingTiers(): Promise<CoatingTier[]> {
  try {
    const doc = await getAdminDb().collection('master_data').doc('coating_tiers').get();
    if (doc.exists) {
      const tiers = doc.data()?.tiers as CoatingTier[] | undefined;
      if (tiers && Array.isArray(tiers) && tiers.length > 0) {
        return tiers;
      }
    }
  } catch { /* fallback */ }
  return hardcodedTiers;
}
