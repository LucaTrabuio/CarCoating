import { describe, it, expect } from 'vitest';
import {
  flattenBusinessHours,
  deriveClosedDayLabel,
  deriveRegularHoliday,
  parseNearbyStations,
  parseParkingSpaces,
  parseCampaignInfo,
  mapStaffRoster,
  mapCertificates,
  mapSurveyAnswersToExtras,
  mapSurveyAnswersToStore,
  labelFor,
  labelList,
  COATING_MENU_LABELS,
  VEHICLE_TYPE_LABELS,
  type KeeperSurveyAnswers,
} from '../lib/keeper-field-map';

// Fixture mirrors store-survey-response-sample.json `answers` (test fixtures
// inline per CLAUDE.md §1). Trimmed file metadata to url/contentType only.
const SAMPLE: KeeperSurveyAnswers = {
  store_name_full: 'KeePer PRO SHOP 横浜店',
  store_name_short: '横浜店',
  phone: '045-123-4567',
  email: 'yokohama@keeper.jp',
  address_zip: '220-0011',
  address_line: '神奈川県横浜市西区高島1-2-3 KeePerビル 1F',
  business_hours: [
    { day: 'mon', status: 'open', openTime: '09:00', closeTime: '19:00' },
    { day: 'tue', status: 'open', openTime: '09:00', closeTime: '19:00' },
    { day: 'wed', status: 'closed' },
    { day: 'thu', status: 'open', openTime: '09:00', closeTime: '19:00' },
    { day: 'fri', status: 'open', openTime: '09:00', closeTime: '19:00' },
    { day: 'sat', status: 'open', openTime: '09:00', closeTime: '20:00' },
    { day: 'sun', status: 'open', openTime: '10:00', closeTime: '18:00' },
    { day: 'hol', status: 'short', openTime: '10:00', closeTime: '17:00' },
  ],
  closed_days_notes: '毎週水曜日定休。年末年始 (12/30〜1/3) は休業。',
  google_map_url: 'https://goo.gl/maps/example-yokohama-001',
  google_place_id: 'ChIJEXAMPLEyokohama001',
  nearest_station: 'JR横浜駅 きた東口 徒歩7分 / みなとみらい線 新高島駅 徒歩3分',
  landmarks: '横浜そごう・横浜ベイクォーター近く。',
  parking: '店舗専用駐車場 5台分 (無料)。施工中は代車有 (要予約)。',
  keeper_rank: 'labo',
  booth_count: '3',
  simultaneous_capacity: '3',
  vehicle_types: ['kei', 'normal', 'suv_minivan', 'import_luxury'],
  coating_menu: ['diamond', 'w_diamond', 'crystal', 'fresh', 'ex'],
  additional_services: ['interior_cleaning', 'glass_coating', 'wheel_coating'],
  payment_methods: ['cash', 'credit_card', 'paypay', 'line_pay', 'rakuten_pay'],
  campaign_info:
    '梅雨前コーティングキャンペーン: ダイヤモンドKeePer 全車種20%OFF (〜2026/6/30)。',
  staff_roster: [
    {
      photo: [{ url: 'https://x/staff_yamada.jpg', path: 'p', contentType: 'image/jpeg' }],
      name: '山田 太郎',
      role: 'manager',
      keeper_cert: '1kyu',
      other_certs: '自動車整備士2級',
      awards: '2024 / 全国大会 / 準優勝',
      comment: '丁寧に仕上げます。',
    },
    {
      photo: [{ url: 'https://x/staff_sato.jpg', path: 'p', contentType: 'image/jpeg' }],
      name: '佐藤 花子',
      role: 'chief_engineer',
      keeper_cert: '2kyu',
      other_certs: 'カーケア技術者1級',
      awards: '2024 / 関東大会 / 3位',
      comment: '細部までこだわります。',
    },
  ],
  store_intro: '横浜駅から徒歩7分の KeePer LABO 認定店舗です。',
  manager_message: '愛車を新車の輝き以上に仕上げます。',
  store_strengths: '・技術検定1級スタッフが常駐\n・代車5台完備',
  exterior_photos: [
    { url: 'https://x/ext_01.jpg', path: 'p', contentType: 'image/jpeg' },
    { url: 'https://x/ext_02.jpg', path: 'p', contentType: 'image/jpeg' },
  ],
  work_area_photos: [{ url: 'https://x/work_01.jpg', path: 'p', contentType: 'image/jpeg' }],
  staff_group_photo: [{ url: 'https://x/group.jpg', path: 'p', contentType: 'image/jpeg' }],
  award_certificates: [{ url: 'https://x/award.pdf', path: 'p', contentType: 'application/pdf' }],
};

describe('flattenBusinessHours', () => {
  it('groups identical schedules and collapses consecutive runs', () => {
    expect(flattenBusinessHours(SAMPLE.business_hours)).toBe(
      '月〜火・木〜金 9:00〜19:00 / 土 9:00〜20:00 / 日 10:00〜18:00 / 祝 10:00〜17:00（短縮）',
    );
  });

  it('does not bridge a closed day into a range', () => {
    const out = flattenBusinessHours([
      { day: 'mon', status: 'open', openTime: '09:00', closeTime: '18:00' },
      { day: 'tue', status: 'closed' },
      { day: 'wed', status: 'open', openTime: '09:00', closeTime: '18:00' },
    ]);
    expect(out).toBe('月・水 9:00〜18:00');
  });

  it('returns empty string for no input', () => {
    expect(flattenBusinessHours(undefined)).toBe('');
    expect(flattenBusinessHours([])).toBe('');
  });
});

describe('regular_holiday', () => {
  it('derives a short closed-day label from the hours array', () => {
    expect(deriveClosedDayLabel(SAMPLE.business_hours)).toBe('水曜日');
  });

  it('labels a closed holiday as 祝日', () => {
    expect(
      deriveClosedDayLabel([{ day: 'hol', status: 'closed' }]),
    ).toBe('祝日');
  });

  it('prefers the human-written note when present', () => {
    expect(
      deriveRegularHoliday(SAMPLE.business_hours, SAMPLE.closed_days_notes),
    ).toBe('毎週水曜日定休。年末年始 (12/30〜1/3) は休業。');
  });

  it('falls back to the derived label when no note', () => {
    expect(deriveRegularHoliday(SAMPLE.business_hours, undefined)).toBe('水曜日');
  });
});

describe('parseNearbyStations', () => {
  it('splits and extracts walk time', () => {
    expect(parseNearbyStations(SAMPLE.nearest_station)).toEqual([
      { name: 'JR横浜駅 きた東口', time: '徒歩7分' },
      { name: 'みなとみらい線 新高島駅', time: '徒歩3分' },
    ]);
  });

  it('keeps the full segment when no time pattern', () => {
    expect(parseNearbyStations('横浜駅すぐ')).toEqual([
      { name: '横浜駅すぐ', time: '' },
    ]);
  });

  it('returns empty array for blank input', () => {
    expect(parseNearbyStations('')).toEqual([]);
  });
});

describe('parseParkingSpaces', () => {
  it('extracts the space count', () => {
    expect(parseParkingSpaces(SAMPLE.parking)).toBe(5);
  });
  it('returns 0 when no count', () => {
    expect(parseParkingSpaces('近隣コインパーキングをご利用ください')).toBe(0);
  });
});

describe('parseCampaignInfo', () => {
  it('extracts title, discount and deadline from free text', () => {
    expect(parseCampaignInfo(SAMPLE.campaign_info)).toEqual({
      campaign_title: '梅雨前コーティングキャンペーン',
      campaign_deadline: '2026-06-30',
      discount_rate: 20,
    });
  });
  it('returns empty fields for blank input', () => {
    expect(parseCampaignInfo(undefined)).toEqual({
      campaign_title: '',
      campaign_deadline: '',
    });
  });
});

describe('mapStaffRoster', () => {
  it('remaps role, photo, bio and combined cert badge', () => {
    expect(mapStaffRoster(SAMPLE.staff_roster)).toEqual([
      {
        id: '1',
        name: '山田 太郎',
        role: '店長',
        photo_url: 'https://x/staff_yamada.jpg',
        bio: '丁寧に仕上げます。',
        certifications: '1級・自動車整備士2級',
      },
      {
        id: '2',
        name: '佐藤 花子',
        role: 'チーフエンジニア',
        photo_url: 'https://x/staff_sato.jpg',
        bio: '細部までこだわります。',
        certifications: '2級・カーケア技術者1級',
      },
    ]);
  });
});

describe('mapCertificates', () => {
  it('skips non-image (PDF) award files', () => {
    expect(mapCertificates(SAMPLE.award_certificates)).toEqual([]);
  });
  it('keeps image awards', () => {
    expect(
      mapCertificates([
        { url: 'https://x/a.jpg', path: 'p', contentType: 'image/jpeg' },
      ]),
    ).toEqual([{ id: '1', title: '', subtitle: '', image_url: 'https://x/a.jpg' }]);
  });
});

describe('label maps', () => {
  it('maps known codes and passes through unknown', () => {
    expect(labelFor(COATING_MENU_LABELS, 'diamond')).toBe('ダイヤモンドKeePer');
    expect(labelFor(COATING_MENU_LABELS, 'mystery_menu')).toBe('mystery_menu');
    expect(labelFor(COATING_MENU_LABELS, undefined)).toBe('');
  });
  it('maps a list of vehicle types', () => {
    expect(labelList(VEHICLE_TYPE_LABELS, SAMPLE.vehicle_types)).toEqual([
      '軽自動車', '普通車', 'SUV・ミニバン', '輸入車・高級車',
    ]);
  });
});

describe('mapSurveyAnswersToExtras', () => {
  it('collects enum labels and unmapped free-text', () => {
    const extras = mapSurveyAnswersToExtras(SAMPLE);
    expect(extras.keeper_rank).toBe('KeePer LABO');
    expect(extras.coating_menu).toEqual([
      'ダイヤモンドKeePer', 'WダイヤモンドKeePer', 'クリスタルKeePer',
      'フレッシュKeePer', 'EX KeePer',
    ]);
    expect(extras.booth_count).toBe(3);
    expect(extras.simultaneous_capacity).toBe(3);
    expect(extras.store_name_short).toBe('横浜店');
    expect(extras.staff_awards).toEqual([
      { name: '山田 太郎', awards: '2024 / 全国大会 / 準優勝' },
      { name: '佐藤 花子', awards: '2024 / 関東大会 / 3位' },
    ]);
  });
});

describe('mapSurveyAnswersToStore', () => {
  const store = mapSurveyAnswersToStore(SAMPLE);

  it('maps direct contact fields', () => {
    expect(store.store_name).toBe('KeePer PRO SHOP 横浜店');
    expect(store.tel).toBe('045-123-4567');
    expect(store.email).toBe('yokohama@keeper.jp');
    expect(store.postal_code).toBe('220-0011');
    expect(store.address).toBe('神奈川県横浜市西区高島1-2-3 KeePerビル 1F');
    expect(store.google_place_id).toBe('ChIJEXAMPLEyokohama001');
    expect(store.access_map_url).toBe('https://goo.gl/maps/example-yokohama-001');
  });

  it('flattens hours and derives holiday', () => {
    expect(store.business_hours).toContain('月〜火・木〜金 9:00〜19:00');
    expect(store.regular_holiday).toBe('毎週水曜日定休。年末年始 (12/30〜1/3) は休業。');
  });

  it('serialises nearby_stations and gallery as JSON, picks hero images', () => {
    expect(JSON.parse(store.nearby_stations!)).toHaveLength(2);
    expect(store.store_exterior_url).toBe('https://x/ext_01.jpg');
    expect(store.store_interior_url).toBe('https://x/work_01.jpg');
    expect(store.staff_photo_url).toBe('https://x/group.jpg');
    // gallery = remaining images (exterior[1]) only — exterior[0]/work[0] promoted
    expect(JSON.parse(store.gallery_images!)).toEqual(['https://x/ext_02.jpg']);
  });

  it('derives staff fields and cert counts', () => {
    expect(JSON.parse(store.staff_members!)).toHaveLength(2);
    expect(store.level1_staff_count).toBe(1);
    expect(store.level2_staff_count).toBe(1);
    expect(store.has_booth).toBe(true);
  });

  it('parses campaign sub-fields', () => {
    expect(store.campaign_title).toBe('梅雨前コーティングキャンペーン');
    expect(store.discount_rate).toBe(20);
    expect(store.campaign_deadline).toBe('2026-06-30');
  });

  it('omits keys when the source is empty (merge-safe)', () => {
    const partial = mapSurveyAnswersToStore({ phone: '03-0000-0000' });
    expect(partial).toEqual({ tel: '03-0000-0000' });
    expect('store_name' in partial).toBe(false);
    expect('business_hours' in partial).toBe(false);
  });
});
