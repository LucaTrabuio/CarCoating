import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { defaultV3Store } from '@/lib/v3-types';

// One-time seed endpoint. Protected by ADMIN_SETUP_KEY.
export async function POST(req: Request) {
  const { setupKey } = await req.json();
  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey || setupKey !== expectedKey) {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
  }

  const db = getAdminDb();

  // Create Sapporo sub-company
  await db.collection('sub_companies').doc('sapporo').set({
    name: 'キーパープロショップ 札幌エリア',
    slug: 'sapporo',
    stores: ['sapporo-honten', 'sapporo-minami', 'sapporo-sattsunae', 'sapporo-yonnana', 'sapporo-mikasa'],
    logo_url: '',
    description: '出光リテール販売株式会社 北海道カンパニー運営のKeePer PRO SHOP。札幌エリア5店舗のネットワーク。',
  });

  // Sapporo stores
  const stores = [
    defaultV3Store({
      store_id: 'sapporo-honten',
      store_name: 'キーパープロショップ コーティングステーション札幌本店',
      sub_company_id: 'sapporo',
      store_slug: 'honten',
      is_active: true,
      address: '北海道札幌市中央区北３条東２丁目２－３８',
      postal_code: '060-0033',
      prefecture: '北海道',
      city: '札幌市中央区',
      lat: 43.0667,
      lng: 141.3563,
      tel: '011-XXX-XXXX',
      business_hours: '9:00〜18:00',
      regular_holiday: '年中無休',
      has_booth: true,
      level1_staff_count: 2,
      level2_staff_count: 1,
      discount_rate: 20,
      hero_title: '札幌本店 — 最高品質のカーコーティング',
      hero_subtitle: 'コーティングステーション札幌本店 ｜ KeePer PRO SHOP認定',
      description: '札幌中央区に位置するコーティングステーション札幌本店。専用コーティングブース完備、レベル1・2認定技術者が在籍。年間施工実績多数。',
      parking_spaces: 5,
      landmark: '北3条東2丁目交差点そば',
    }),
    defaultV3Store({
      store_id: 'sapporo-minami',
      store_name: 'キーパープロショップ 札幌南店',
      sub_company_id: 'sapporo',
      store_slug: 'minami',
      is_active: true,
      address: '北海道札幌市中央区南１６条西１１ー３ー１',
      postal_code: '064-0916',
      prefecture: '北海道',
      city: '札幌市中央区',
      lat: 43.0397,
      lng: 141.3390,
      tel: '011-XXX-XXXX',
      business_hours: '9:00〜18:00',
      regular_holiday: '年中無休',
      has_booth: true,
      level1_staff_count: 1,
      level2_staff_count: 1,
      discount_rate: 20,
      hero_title: '札幌南店 — 南区エリアのKeePer PRO SHOP',
      description: '札幌南エリアのKeePer PRO SHOP。アクセス便利な立地で、高品質なカーコーティングを提供。',
      parking_spaces: 4,
    }),
    defaultV3Store({
      store_id: 'sapporo-sattsunae',
      store_name: 'キーパープロショップ 札苗店',
      sub_company_id: 'sapporo',
      store_slug: 'sattsunae',
      is_active: true,
      address: '北海道札幌市東区東苗穂３条２-４-２０',
      postal_code: '007-0803',
      prefecture: '北海道',
      city: '札幌市東区',
      lat: 43.0944,
      lng: 141.4103,
      tel: '011-XXX-XXXX',
      business_hours: '9:00〜18:00',
      regular_holiday: '年中無休',
      has_booth: true,
      level1_staff_count: 1,
      level2_staff_count: 0,
      discount_rate: 20,
      hero_title: '札苗店 — 東区エリアのKeePer PRO SHOP',
      description: '札幌東区・東苗穂エリアのKeePer PRO SHOP。広々とした駐車場と丁寧な施工が特徴。',
      parking_spaces: 6,
    }),
    defaultV3Store({
      store_id: 'sapporo-yonnana',
      store_name: 'キーパープロショップ よんなな店',
      sub_company_id: 'sapporo',
      store_slug: 'yonnana',
      is_active: true,
      address: '北海道札幌市東区北四十七条東7丁目824',
      postal_code: '007-0847',
      prefecture: '北海道',
      city: '札幌市東区',
      lat: 43.1167,
      lng: 141.3811,
      tel: '011-XXX-XXXX',
      business_hours: '9:00〜18:00',
      regular_holiday: '年中無休',
      has_booth: false,
      level1_staff_count: 1,
      level2_staff_count: 0,
      discount_rate: 20,
      hero_title: 'よんなな店 — 北47条のKeePer PRO SHOP',
      description: '札幌東区・北47条エリアのKeePer PRO SHOP。気軽に立ち寄れるアクセスの良さが魅力。',
      parking_spaces: 3,
    }),
    defaultV3Store({
      store_id: 'sapporo-mikasa',
      store_name: 'キーパープロショップ 三笠店',
      sub_company_id: 'sapporo',
      store_slug: 'mikasa',
      is_active: true,
      address: '北海道三笠市幸町５',
      postal_code: '068-2153',
      prefecture: '北海道',
      city: '三笠市',
      lat: 43.2453,
      lng: 141.8758,
      tel: '01267-X-XXXX',
      business_hours: '9:00〜18:00',
      regular_holiday: '年中無休',
      has_booth: false,
      level1_staff_count: 1,
      level2_staff_count: 0,
      discount_rate: 20,
      hero_title: '三笠店 — 空知エリアのKeePer PRO SHOP',
      description: '三笠市のKeePer PRO SHOP。空知エリアのお客様に高品質なカーコーティングを提供。',
      parking_spaces: 5,
    }),
  ];

  // Batch write stores
  const batch = db.batch();
  for (const store of stores) {
    batch.set(db.collection('stores').doc(store.store_id), store, { merge: true });
  }
  await batch.commit();

  return NextResponse.json({
    success: true,
    sub_company: 'sapporo',
    stores_created: stores.map(s => s.store_id),
    message: 'Sapporo sub-company and 5 stores created. Visit /sapporo to see the landing page.',
  });
}
