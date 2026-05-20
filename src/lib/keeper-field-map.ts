// Keeper (Meets-SPI) store-survey → V3 store-field transforms.
//
// PURE, side-effect-free mapping layer. Given the `answers` object of a
// store-survey response (the shape produced by the in-app survey form and
// mirrored to `storeSurveyResponses/{id}` — see
// `store-survey-response-sample.json`), it produces a `Partial<V3StoreData>`
// ready to merge into a store doc, plus an `extras` bag for survey data that
// has no flat V3 column yet (enum label lists, manager message, awards …).
//
// This module deliberately does NOT import `keeper-sync.ts`: the sync
// orchestrator owns persistence, this owns shape conversion. Keeping them
// decoupled lets the migration evolve without touching the transform rules
// (and avoids merge collisions while both are in flight).
//
// Design rules:
//  - Every transform tolerates missing / partial input (survey forms can be
//    submitted incomplete) and returns "" / [] / 0 rather than throwing.
//  - `mapSurveyAnswersToStore` OMITS keys whose transform yields an empty
//    value, because the migration writes with `{ merge: true }` — emitting
//    "" would clobber existing store data on a partial resubmission.
//  - Enum → label maps fall back to the raw code when an unknown value
//    appears, so a new survey option degrades to a readable-ish string
//    instead of vanishing.

import type { V3StoreData } from './v3-types';
import type { StaffMember, Certification } from './block-types';

// ─── Source answer shapes (mirror the survey form output) ─────

export type SurveyWeekday =
  | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'hol';

export type SurveyHourStatus = 'open' | 'closed' | 'short';

export interface SurveyBusinessHour {
  day: SurveyWeekday;
  status: SurveyHourStatus;
  openTime?: string;   // "09:00" — present when status !== 'closed'
  closeTime?: string;  // "19:00"
}

/** An uploaded file as embedded in a survey answer (already in Storage). */
export interface SurveyUploadedFile {
  url: string;
  path: string;
  name?: string;
  size?: number;
  contentType?: string;
  uploadedAt?: number;
  storeId?: string;
  storeName?: string;
  fieldId?: string;
}

export interface SurveyStaffMember {
  photo?: SurveyUploadedFile[];
  name?: string;
  role?: string;        // enum code, e.g. "manager"
  keeper_cert?: string; // enum code, e.g. "1kyu"
  other_certs?: string; // free text
  awards?: string;      // free text, may be multi-line
  comment?: string;     // free text blurb
}

export interface KeeperSurveyAnswers {
  store_name_full?: string;
  store_name_short?: string;
  phone?: string;
  email?: string;
  address_zip?: string;
  address_line?: string;

  business_hours?: SurveyBusinessHour[];
  closed_days_notes?: string;
  google_map_url?: string;
  google_place_id?: string;
  nearest_station?: string;
  landmarks?: string;
  parking?: string;

  keeper_rank?: string;
  booth_count?: string;
  simultaneous_capacity?: string;
  vehicle_types?: string[];
  coating_menu?: string[];
  additional_services?: string[];
  payment_methods?: string[];
  campaign_info?: string;

  staff_roster?: SurveyStaffMember[];
  store_intro?: string;
  manager_message?: string;
  store_strengths?: string;

  exterior_photos?: SurveyUploadedFile[];
  exterior_photos2?: SurveyUploadedFile[];
  work_area_photos?: SurveyUploadedFile[];
  staff_group_photo?: SurveyUploadedFile[];
  award_certificates?: SurveyUploadedFile[];
}

// ─── Enum → display-label maps ───────────────────────────────
// These are the source of truth for survey-code → 日本語 conversion.
// Extend here when the survey adds an option; unknown codes pass through.

export const WEEKDAY_LABELS: Record<SurveyWeekday, string> = {
  mon: '月', tue: '火', wed: '水', thu: '木',
  fri: '金', sat: '土', sun: '日', hol: '祝',
};

/** Week order used when grouping/flattening hours (祝 last). */
const WEEKDAY_ORDER: SurveyWeekday[] = [
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'hol',
];

export const KEEPER_RANK_LABELS: Record<string, string> = {
  labo: 'KeePer LABO',
  pro_shop: 'KeePer PRO SHOP',
  pro: 'KeePer PRO SHOP',
  regular: 'KeePer 認定店',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  kei: '軽自動車',
  compact: 'コンパクトカー',
  normal: '普通車',
  wagon: 'ステーションワゴン',
  suv: 'SUV',
  minivan: 'ミニバン',
  suv_minivan: 'SUV・ミニバン',
  import: '輸入車',
  luxury: '高級車',
  import_luxury: '輸入車・高級車',
  large: '大型車',
  truck: 'トラック',
};

export const COATING_MENU_LABELS: Record<string, string> = {
  diamond: 'ダイヤモンドKeePer',
  w_diamond: 'WダイヤモンドKeePer',
  crystal: 'クリスタルKeePer',
  fresh: 'フレッシュKeePer',
  ex: 'EX KeePer',
  pure: 'ピュアKeePer',
  eco: 'ECOプラスダイヤモンドKeePer',
  premium: 'プレミアムコーティング',
};

export const ADDITIONAL_SERVICE_LABELS: Record<string, string> = {
  interior_cleaning: '車内クリーニング',
  glass_coating: 'ガラスコーティング',
  wheel_coating: 'ホイールコーティング',
  window_film: 'ウィンドウフィルム',
  headlight: 'ヘッドライトリペア',
  body_polish: 'ボディ磨き',
  scratch_repair: 'キズ・へこみ修理',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  credit_card: 'クレジットカード',
  paypay: 'PayPay',
  line_pay: 'LINE Pay',
  rakuten_pay: '楽天ペイ',
  d_payment: 'd払い',
  au_pay: 'au PAY',
  merpay: 'メルペイ',
  bank_transfer: '銀行振込',
  qr: 'QRコード決済',
};

export const STAFF_ROLE_LABELS: Record<string, string> = {
  manager: '店長',
  assistant_manager: '副店長',
  chief_engineer: 'チーフエンジニア',
  engineer: 'エンジニア',
  senior_staff: 'シニアスタッフ',
  staff: 'スタッフ',
};

export const KEEPER_CERT_LABELS: Record<string, string> = {
  '1kyu': '1級',
  '2kyu': '2級',
  '3kyu': '3級',
  inspector: '検定員',
  instructor: 'インストラクター',
};

/** Look up a code in a label map; fall back to the raw code (never empty unless code is empty). */
export function labelFor(
  map: Record<string, string>,
  code: string | undefined | null,
): string {
  if (!code) return '';
  return map[code] ?? code;
}

/** Map an array of codes to labels, dropping empties. */
export function labelList(
  map: Record<string, string>,
  codes: string[] | undefined | null,
): string[] {
  return (codes ?? []).map((c) => labelFor(map, c)).filter(Boolean);
}

// ─── business_hours flatten ──────────────────────────────────

/**
 * Flatten the per-day hours array into one display string, grouping days that
 * share an identical (status, open, close) schedule and collapsing runs of
 * consecutive week days into ranges.
 *
 * Example (the sample response):
 *   "月〜火・木〜金 9:00〜19:00 / 土 9:00〜20:00 / 日 10:00〜18:00 / 祝 10:00〜17:00（短縮）"
 *
 * Closed days are excluded here (they surface via `deriveRegularHoliday`).
 */
export function flattenBusinessHours(
  hours: SurveyBusinessHour[] | undefined,
): string {
  if (!hours || hours.length === 0) return '';

  const byDay = new Map<SurveyWeekday, SurveyBusinessHour>();
  for (const h of hours) byDay.set(h.day, h);

  type Run = { key: string; days: SurveyWeekday[] };
  const runs: Run[] = [];

  for (const day of WEEKDAY_ORDER) {
    const h = byDay.get(day);
    if (!h || h.status === 'closed' || !h.openTime || !h.closeTime) continue;
    const key = `${h.status}|${h.openTime}|${h.closeTime}`;
    const last = runs[runs.length - 1];
    // Extend the previous run only if it is the immediately preceding week day
    // with the same schedule (so a closed/different day breaks the range).
    const prevDay = last?.days[last.days.length - 1];
    const adjacent =
      prevDay != null &&
      WEEKDAY_ORDER.indexOf(day) === WEEKDAY_ORDER.indexOf(prevDay) + 1;
    if (last && last.key === key && adjacent) {
      last.days.push(day);
    } else {
      runs.push({ key, days: [day] });
    }
  }

  if (runs.length === 0) return '';

  // Group runs that share the same schedule (e.g. 月〜火 and 木〜金), preserving
  // first-appearance order.
  const groupOrder: string[] = [];
  const groupRuns = new Map<string, Run[]>();
  for (const run of runs) {
    if (!groupRuns.has(run.key)) {
      groupRuns.set(run.key, []);
      groupOrder.push(run.key);
    }
    groupRuns.get(run.key)!.push(run);
  }

  const segments = groupOrder.map((key) => {
    const [status, open, close] = key.split('|');
    const dayLabel = groupRuns
      .get(key)!
      .map((run) => formatDayRun(run.days))
      .join('・');
    const time = `${stripLeadingZero(open)}〜${stripLeadingZero(close)}`;
    const suffix = status === 'short' ? '（短縮）' : '';
    return `${dayLabel} ${time}${suffix}`;
  });

  return segments.join(' / ');
}

/** ["mon"] → "月", ["mon","tue","wed"] → "月〜水". */
function formatDayRun(days: SurveyWeekday[]): string {
  if (days.length === 1) return WEEKDAY_LABELS[days[0]];
  return `${WEEKDAY_LABELS[days[0]]}〜${WEEKDAY_LABELS[days[days.length - 1]]}`;
}

/** "09:00" → "9:00" (match the existing inline-hours display style). */
function stripLeadingZero(time: string): string {
  return time.replace(/^0(\d)/, '$1');
}

// ─── regular_holiday ─────────────────────────────────────────

/** Closed-day short label derived purely from the hours array, e.g. "水曜日" / "水・木曜日・祝日". */
export function deriveClosedDayLabel(
  hours: SurveyBusinessHour[] | undefined,
): string {
  const weekdayClosed = (hours ?? [])
    .filter((h) => h.status === 'closed' && h.day !== 'hol')
    .map((h) => WEEKDAY_LABELS[h.day]);
  const holClosed = (hours ?? []).some(
    (h) => h.status === 'closed' && h.day === 'hol',
  );
  const parts: string[] = [];
  if (weekdayClosed.length) parts.push(`${weekdayClosed.join('・')}曜日`);
  if (holClosed) parts.push('祝日');
  return parts.join('・');
}

/**
 * Build the `regular_holiday` value. Prefers the human-written
 * `closed_days_notes` (it carries year-end / Obon detail the day flags can't),
 * falling back to the derived closed-day label.
 */
export function deriveRegularHoliday(
  hours: SurveyBusinessHour[] | undefined,
  closedDaysNotes: string | undefined,
): string {
  const note = closedDaysNotes?.trim();
  if (note) return note;
  return deriveClosedDayLabel(hours);
}

// ─── nearest_station → nearby_stations ───────────────────────

export interface NearbyStation {
  name: string;
  time: string;
}

const STATION_TIME_RE = /((?:徒歩|車で?|バス)?\s*\d+\s*分)\s*$/;

/**
 * Parse the free-text station field into the `{ name, time }[]` shape that
 * AccessBlock renders. Splits on "/", "／" and newlines (NOT "、", which can
 * appear inside a single station description).
 *
 * "JR横浜駅 きた東口 徒歩7分 / みなとみらい線 新高島駅 徒歩3分"
 *   → [{ name: "JR横浜駅 きた東口", time: "徒歩7分" }, …]
 */
export function parseNearbyStations(
  text: string | undefined,
): NearbyStation[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\s*[/／\n]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const m = seg.match(STATION_TIME_RE);
      if (m && m.index != null) {
        return {
          name: seg.slice(0, m.index).trim() || seg,
          time: m[1].replace(/\s+/g, ''),
        };
      }
      return { name: seg, time: '' };
    });
}

// ─── parking → parking_spaces ────────────────────────────────

/** Extract the space count from free-text parking notes; "5台分 (無料)" → 5. */
export function parseParkingSpaces(text: string | undefined): number {
  if (!text) return 0;
  const m = text.match(/(\d+)\s*台/);
  return m ? parseInt(m[1], 10) : 0;
}

// ─── campaign_info → campaign_* ──────────────────────────────

export interface ParsedCampaign {
  campaign_title: string;
  campaign_deadline: string;
  discount_rate?: number;
}

const DISCOUNT_RE = /(\d+)\s*%\s*OFF/i;
const DATE_RE = /(\d{4})[/\-年.](\d{1,2})[/\-月.](\d{1,2})/;

/**
 * Best-effort parse of the free-text campaign blurb into structured fields.
 * Conservative on purpose — only fills what it can confidently extract:
 *   - title:    text before the first "：" / ":" / "。"
 *   - discount: first "NN%OFF"
 *   - deadline: first YYYY/M/D-style date, normalised to YYYY-MM-DD
 * The full original text remains available via `extras` for display blocks.
 */
export function parseCampaignInfo(text: string | undefined): ParsedCampaign {
  const result: ParsedCampaign = { campaign_title: '', campaign_deadline: '' };
  if (!text || !text.trim()) return result;

  const trimmed = text.trim();
  const titleMatch = trimmed.split(/[：:。\n]/)[0]?.trim();
  if (titleMatch) result.campaign_title = titleMatch;

  const discount = trimmed.match(DISCOUNT_RE);
  if (discount) {
    const n = parseInt(discount[1], 10);
    if (!isNaN(n) && n > 0 && n <= 100) result.discount_rate = n;
  }

  const date = trimmed.match(DATE_RE);
  if (date) {
    const [, y, m, d] = date;
    result.campaign_deadline = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return result;
}

// ─── staff_roster → staff_members ────────────────────────────

/**
 * Remap survey staff entries to the storefront `StaffMember[]` shape.
 *  - role:           enum code → 日本語 label
 *  - photo_url:      first uploaded photo's URL
 *  - bio:            the free-text comment
 *  - certifications: KeePer cert label + other certs (free-text badge)
 * `awards` has no StaffMember home — surfaced via `extras.staff_awards`.
 */
export function mapStaffRoster(
  roster: SurveyStaffMember[] | undefined,
): StaffMember[] {
  return (roster ?? []).map((s, i) => ({
    id: String(i + 1),
    name: s.name?.trim() ?? '',
    role: labelFor(STAFF_ROLE_LABELS, s.role),
    photo_url: s.photo?.[0]?.url ?? '',
    bio: s.comment?.trim() ?? '',
    certifications: [
      labelFor(KEEPER_CERT_LABELS, s.keeper_cert),
      s.other_certs?.trim(),
    ]
      .filter(Boolean)
      .join('・'),
  }));
}

/** Count staff holding a given KeePer cert code — feeds level1/2_staff_count. */
function countCert(
  roster: SurveyStaffMember[] | undefined,
  code: string,
): number {
  return (roster ?? []).filter((s) => s.keeper_cert === code).length;
}

// ─── File / image mapping ────────────────────────────────────

function isImageFile(f: SurveyUploadedFile): boolean {
  return !!f.contentType && f.contentType.startsWith('image/');
}

function firstUrl(files: SurveyUploadedFile[] | undefined): string {
  return files && files.length > 0 ? (files[0].url ?? '') : '';
}

/**
 * Build the additional-photos gallery: every image EXCEPT the ones already
 * promoted to a dedicated slot (exterior[0] → store_exterior_url,
 * work_area[0] → store_interior_url).
 */
function collectGalleryImages(answers: KeeperSurveyAnswers): string[] {
  const urls: string[] = [];
  const add = (files: SurveyUploadedFile[] | undefined, skipFirst: boolean) => {
    (files ?? []).forEach((f, i) => {
      if (skipFirst && i === 0) return;
      if (f.url && isImageFile(f)) urls.push(f.url);
    });
  };
  add(answers.exterior_photos, true);
  add(answers.exterior_photos2, false);
  add(answers.work_area_photos, true);
  return urls;
}

/**
 * Map award files to the `Certification[]` shape. Only image files are usable
 * (the block renders <img>); PDFs are skipped and need manual handling in the
 * builder. Titles are left blank for an editor to fill.
 */
export function mapCertificates(
  files: SurveyUploadedFile[] | undefined,
): Certification[] {
  return (files ?? [])
    .filter(isImageFile)
    .map((f, i) => ({
      id: String(i + 1),
      title: '',
      subtitle: '',
      image_url: f.url ?? '',
    }));
}

// ─── extras (no flat V3 column yet) ──────────────────────────

export interface KeeperSurveyExtras {
  store_name_short: string;
  manager_message: string;
  store_strengths: string;
  campaign_info: string;
  parking_note: string;
  keeper_rank: string;            // display label
  vehicle_types: string[];        // display labels
  coating_menu: string[];         // display labels
  additional_services: string[];  // display labels
  payment_methods: string[];      // display labels
  booth_count: number;
  simultaneous_capacity: number;
  staff_awards: { name: string; awards: string }[];
}

/** Survey data that maps to no flat V3StoreData column — for CMS blocks / review. */
export function mapSurveyAnswersToExtras(
  answers: KeeperSurveyAnswers,
): KeeperSurveyExtras {
  return {
    store_name_short: answers.store_name_short?.trim() ?? '',
    manager_message: answers.manager_message?.trim() ?? '',
    store_strengths: answers.store_strengths?.trim() ?? '',
    campaign_info: answers.campaign_info?.trim() ?? '',
    parking_note: answers.parking?.trim() ?? '',
    keeper_rank: labelFor(KEEPER_RANK_LABELS, answers.keeper_rank),
    vehicle_types: labelList(VEHICLE_TYPE_LABELS, answers.vehicle_types),
    coating_menu: labelList(COATING_MENU_LABELS, answers.coating_menu),
    additional_services: labelList(
      ADDITIONAL_SERVICE_LABELS,
      answers.additional_services,
    ),
    payment_methods: labelList(PAYMENT_METHOD_LABELS, answers.payment_methods),
    booth_count: parseIntSafe(answers.booth_count),
    simultaneous_capacity: parseIntSafe(answers.simultaneous_capacity),
    staff_awards: (answers.staff_roster ?? [])
      .filter((s) => s.awards?.trim())
      .map((s) => ({ name: s.name?.trim() ?? '', awards: s.awards!.trim() })),
  };
}

function parseIntSafe(val: string | undefined): number {
  const n = parseInt(val ?? '', 10);
  return isNaN(n) ? 0 : n;
}

// ─── Top-level: answers → Partial<V3StoreData> ───────────────

/**
 * Convert a survey response's `answers` into a `Partial<V3StoreData>` suitable
 * for a `{ merge: true }` write. Keys whose transform yields an empty value
 * are OMITTED so a partial / re-submitted survey never wipes existing fields.
 */
export function mapSurveyAnswersToStore(
  answers: KeeperSurveyAnswers,
): Partial<V3StoreData> {
  const out: Partial<V3StoreData> = {};
  const setStr = (key: keyof V3StoreData, val: string | undefined) => {
    const v = val?.trim();
    if (v) (out as Record<string, unknown>)[key] = v;
  };

  // Identity & contact
  setStr('store_name', answers.store_name_full);
  setStr('tel', answers.phone);
  setStr('email', answers.email);
  setStr('postal_code', answers.address_zip);
  setStr('address', answers.address_line);
  setStr('access_map_url', answers.google_map_url);
  setStr('google_place_id', answers.google_place_id);
  setStr('landmark', answers.landmarks);
  setStr('description', answers.store_intro);

  // Hours
  const hours = flattenBusinessHours(answers.business_hours);
  if (hours) out.business_hours = hours;
  const holiday = deriveRegularHoliday(
    answers.business_hours,
    answers.closed_days_notes,
  );
  if (holiday) out.regular_holiday = holiday;

  // Stations
  const stations = parseNearbyStations(answers.nearest_station);
  if (stations.length) out.nearby_stations = JSON.stringify(stations);

  // Parking
  const spaces = parseParkingSpaces(answers.parking);
  if (spaces > 0) out.parking_spaces = spaces;

  // Campaign
  const campaign = parseCampaignInfo(answers.campaign_info);
  if (campaign.campaign_title) out.campaign_title = campaign.campaign_title;
  if (campaign.campaign_deadline) {
    out.campaign_deadline = campaign.campaign_deadline;
  }
  if (campaign.discount_rate != null) out.discount_rate = campaign.discount_rate;

  // Images
  const exterior = firstUrl(answers.exterior_photos);
  if (exterior) out.store_exterior_url = exterior;
  const interior = firstUrl(answers.work_area_photos);
  if (interior) out.store_interior_url = interior;
  const staffPhoto = firstUrl(answers.staff_group_photo);
  if (staffPhoto) out.staff_photo_url = staffPhoto;

  const gallery = collectGalleryImages(answers);
  if (gallery.length) out.gallery_images = JSON.stringify(gallery);

  const certs = mapCertificates(answers.award_certificates);
  if (certs.length) out.certifications = JSON.stringify(certs);

  // Staff
  const staff = mapStaffRoster(answers.staff_roster);
  if (staff.length) out.staff_members = JSON.stringify(staff);
  if (answers.staff_roster && answers.staff_roster.length) {
    const lvl1 = countCert(answers.staff_roster, '1kyu');
    const lvl2 = countCert(answers.staff_roster, '2kyu');
    if (lvl1 > 0) out.level1_staff_count = lvl1;
    if (lvl2 > 0) out.level2_staff_count = lvl2;
  }

  // Capabilities
  const booths = parseIntSafe(answers.booth_count);
  if (answers.booth_count != null) out.has_booth = booths > 0;

  return out;
}

// ─── Mapping manifest (drives the admin "field mapping" view) ─
//
// Human-readable description of every survey field and where it lands. Kept
// next to the transforms so the two stay in sync; the unit test asserts that
// every `direct`/`transformed`/`derived` target is actually populated by
// `mapSurveyAnswersToStore(SAMPLE_SURVEY_ANSWERS)` (and vice-versa) so this
// table cannot silently drift from the code.

export type KeeperMapStatus =
  | 'direct'       // copied as-is (trimmed)
  | 'transformed'  // parsed / reshaped before storing
  | 'derived'      // computed from one or more answers
  | 'extras'       // captured but no flat V3 column yet → extras bag
  | 'unmapped'     // present in the survey but currently dropped
  | 'no-source';   // V3 store field with no survey input

export interface KeeperFieldMapEntry {
  /** Survey answer key ("" for a store field with no survey source). */
  survey: string;
  surveyLabel: string;
  /** Target V3StoreData key ("" when extras / unmapped). */
  target: string;
  targetLabel: string;
  /** Short description of the transform. */
  how: string;
  status: KeeperMapStatus;
}

export const KEEPER_FIELD_MAP_MANIFEST: KeeperFieldMapEntry[] = [
  // ── Connected: direct copies ──
  { survey: 'store_name_full', surveyLabel: '店舗名（正式名称）', target: 'store_name', targetLabel: '店舗名', how: 'そのまま（前後空白を除去）', status: 'direct' },
  { survey: 'phone', surveyLabel: '電話番号', target: 'tel', targetLabel: '電話番号', how: 'そのまま', status: 'direct' },
  { survey: 'email', surveyLabel: 'メールアドレス', target: 'email', targetLabel: 'メールアドレス', how: 'そのまま', status: 'direct' },
  { survey: 'address_zip', surveyLabel: '郵便番号', target: 'postal_code', targetLabel: '郵便番号', how: 'そのまま', status: 'direct' },
  { survey: 'address_line', surveyLabel: '住所', target: 'address', targetLabel: '住所', how: 'そのまま', status: 'direct' },
  { survey: 'google_map_url', surveyLabel: 'GoogleマップURL', target: 'access_map_url', targetLabel: 'アクセスマップURL', how: 'そのまま', status: 'direct' },
  { survey: 'google_place_id', surveyLabel: 'Google Place ID', target: 'google_place_id', targetLabel: 'Google Place ID', how: 'そのまま', status: 'direct' },
  { survey: 'landmarks', surveyLabel: '周辺ランドマーク', target: 'landmark', targetLabel: '目印', how: 'そのまま', status: 'direct' },
  { survey: 'store_intro', surveyLabel: '店舗紹介文', target: 'description', targetLabel: '紹介文', how: 'そのまま', status: 'direct' },
  { survey: 'staff_group_photo', surveyLabel: 'スタッフ集合写真', target: 'staff_photo_url', targetLabel: 'スタッフ写真', how: '先頭画像のURL', status: 'direct' },

  // ── Connected: transformed ──
  { survey: 'business_hours', surveyLabel: '営業時間', target: 'business_hours', targetLabel: '営業時間', how: '曜日配列を1行に集約（連続する同条件をまとめ、祝は短縮表記）', status: 'transformed' },
  { survey: 'closed_days_notes', surveyLabel: '定休日・補足', target: 'regular_holiday', targetLabel: '定休日', how: '備考文を優先、無ければ営業時間から定休曜日を生成', status: 'transformed' },
  { survey: 'nearest_station', surveyLabel: '最寄り駅・バス停', target: 'nearby_stations', targetLabel: '最寄り駅（JSON）', how: '「名称＋徒歩N分」を解析しJSON配列化', status: 'transformed' },
  { survey: 'parking', surveyLabel: '駐車場', target: 'parking_spaces', targetLabel: '駐車台数', how: '「N台」を抽出（補足文はextrasへ）', status: 'transformed' },
  { survey: 'campaign_info', surveyLabel: 'キャンペーン情報', target: 'campaign_title', targetLabel: 'キャンペーン名', how: '自由文の先頭をタイトルとして抽出', status: 'transformed' },
  { survey: 'campaign_info', surveyLabel: 'キャンペーン情報', target: 'campaign_deadline', targetLabel: 'キャンペーン期限', how: '日付を抽出しYYYY-MM-DD化', status: 'transformed' },
  { survey: 'campaign_info', surveyLabel: 'キャンペーン情報', target: 'discount_rate', targetLabel: '割引率', how: '「NN%OFF」を抽出', status: 'transformed' },
  { survey: 'staff_roster', surveyLabel: 'スタッフ一覧', target: 'staff_members', targetLabel: 'スタッフ（JSON）', how: 'StaffMember[]へ変換（役職・資格をラベル化、写真URL・コメントを移植）', status: 'transformed' },
  { survey: 'exterior_photos', surveyLabel: '外観写真', target: 'store_exterior_url', targetLabel: '外観写真', how: '先頭画像を採用、残りはギャラリーへ', status: 'transformed' },
  { survey: 'work_area_photos', surveyLabel: '施工エリア写真', target: 'store_interior_url', targetLabel: '内観写真', how: '先頭画像を採用、残りはギャラリーへ', status: 'transformed' },
  { survey: 'exterior_photos / work_area_photos', surveyLabel: '各種写真の余り', target: 'gallery_images', targetLabel: 'ギャラリー（JSON）', how: '専用枠に使われなかった画像を集約', status: 'transformed' },
  { survey: 'award_certificates', surveyLabel: '受賞・認定証', target: 'certifications', targetLabel: '認定証（JSON）', how: '画像のみCertification[]化（PDFは除外）', status: 'transformed' },

  // ── Connected: derived ──
  { survey: 'booth_count', surveyLabel: '施工ブース数', target: 'has_booth', targetLabel: 'ブース有無', how: '1以上ならtrue', status: 'derived' },
  { survey: 'staff_roster', surveyLabel: 'スタッフ一覧', target: 'level1_staff_count', targetLabel: '1級スタッフ数', how: '資格コード 1kyu の人数を集計', status: 'derived' },
  { survey: 'staff_roster', surveyLabel: 'スタッフ一覧', target: 'level2_staff_count', targetLabel: '2級スタッフ数', how: '資格コード 2kyu の人数を集計', status: 'derived' },

  // ── Captured but no flat V3 column (→ extras bag, for CMS blocks) ──
  { survey: 'store_name_short', surveyLabel: '店舗名（呼称）', target: '', targetLabel: 'extras.store_name_short', how: '該当する単一カラムが無いためextrasに保持', status: 'extras' },
  { survey: 'keeper_rank', surveyLabel: 'KeePer認定ランク', target: '', targetLabel: 'extras.keeper_rank', how: 'コードをラベル化してextrasへ', status: 'extras' },
  { survey: 'vehicle_types', surveyLabel: '対応可能車種', target: '', targetLabel: 'extras.vehicle_types', how: 'コード配列をラベル配列化', status: 'extras' },
  { survey: 'coating_menu', surveyLabel: '取扱コーティングメニュー', target: '', targetLabel: 'extras.coating_menu', how: 'コード配列をラベル配列化', status: 'extras' },
  { survey: 'additional_services', surveyLabel: '付帯サービス', target: '', targetLabel: 'extras.additional_services', how: 'コード配列をラベル配列化', status: 'extras' },
  { survey: 'payment_methods', surveyLabel: '支払い方法', target: '', targetLabel: 'extras.payment_methods', how: 'コード配列をラベル配列化', status: 'extras' },
  { survey: 'simultaneous_capacity', surveyLabel: '同時施工可能台数', target: '', targetLabel: 'extras.simultaneous_capacity', how: '数値としてextrasへ', status: 'extras' },
  { survey: 'booth_count', surveyLabel: '施工ブース数', target: '', targetLabel: 'extras.booth_count', how: '数値としてextrasへ（has_booth導出にも使用）', status: 'extras' },
  { survey: 'manager_message', surveyLabel: '店長メッセージ', target: '', targetLabel: 'extras.manager_message', how: '専用カラムが無いためextrasへ', status: 'extras' },
  { survey: 'store_strengths', surveyLabel: '店舗の強み・こだわり', target: '', targetLabel: 'extras.store_strengths', how: '専用カラムが無いためextrasへ', status: 'extras' },
  { survey: 'staff_roster[].awards', surveyLabel: 'スタッフ受賞歴', target: '', targetLabel: 'extras.staff_awards', how: 'StaffMemberに項目が無いためextrasへ', status: 'extras' },

  // ── Captured but currently dropped ──
  { survey: 'road_access', surveyLabel: '幹線道路・ICアクセス', target: '', targetLabel: '—', how: '現状マッピング未対応（要追加）', status: 'unmapped' },
  { survey: 'award_certificates (PDF)', surveyLabel: '受賞・認定証（PDF）', target: '', targetLabel: '—', how: 'PDFは<img>描画不可のため除外（手動対応）', status: 'unmapped' },

  // ── Store fields with no survey source ──
  { survey: '', surveyLabel: '—', target: 'lat', targetLabel: '緯度', how: 'サーベイ非対象（座標は別途設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'lng', targetLabel: '経度', how: 'サーベイ非対象（座標は別途設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'prefecture', targetLabel: '都道府県', how: '住所は1行で取得（都道府県/市区は未分割）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'city', targetLabel: '市区町村', how: '住所は1行で取得（都道府県/市区は未分割）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'line_url', targetLabel: 'LINE URL', how: 'サーベイ非対象', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'hero_title', targetLabel: 'ヒーロー見出し', how: 'サーベイ非対象（ビルダーで設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'hero_subtitle', targetLabel: 'ヒーロー副見出し', how: 'サーベイ非対象（ビルダーで設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'hero_image_url', targetLabel: 'ヒーロー画像', how: 'サーベイに対応画像が無い（ビルダーで設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'logo_url', targetLabel: 'ロゴ', how: 'サーベイ非対象', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'before_after_url', targetLabel: 'ビフォーアフター', how: 'サーベイ非対象（施工事例から設定）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'campaign_banner_url', targetLabel: 'キャンペーンバナー', how: 'サーベイ非対象', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'meta_description', targetLabel: 'メタディスクリプション', how: 'サーベイ非対象（SEOは別管理）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'seo_keywords', targetLabel: 'SEOキーワード', how: 'サーベイ非対象（SEOは別管理）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'price_multiplier', targetLabel: '価格係数', how: '料金は本部マスタ管理（サーベイ非対象）', status: 'no-source' },
  { survey: '', surveyLabel: '—', target: 'min_price_limit', targetLabel: '最低価格', how: '料金は本部マスタ管理（サーベイ非対象）', status: 'no-source' },
];

// ─── Canonical sample (shared by the admin preview and unit tests) ─
// Mirrors store-survey-response-sample.json `answers`. Reference data per
// CLAUDE.md §1 (no business config — illustrative survey content only).

export const SAMPLE_SURVEY_ANSWERS: KeeperSurveyAnswers = {
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
  closed_days_notes:
    '毎週水曜日定休。年末年始 (12/30〜1/3) は休業。お盆期間 (8/13〜8/15) は短縮営業。',
  google_map_url: 'https://goo.gl/maps/example-yokohama-001',
  google_place_id: 'ChIJEXAMPLEyokohama001',
  nearest_station: 'JR横浜駅 きた東口 徒歩7分 / みなとみらい線 新高島駅 徒歩3分',
  landmarks: '横浜そごう・横浜ベイクォーター近く。高島町交差点角の白い4階建てビル1F。',
  parking: '店舗専用駐車場 5台分 (無料)。施工中は代車有 (要予約)。',
  keeper_rank: 'labo',
  booth_count: '3',
  simultaneous_capacity: '3',
  vehicle_types: ['kei', 'normal', 'suv_minivan', 'import_luxury'],
  coating_menu: ['diamond', 'w_diamond', 'crystal', 'fresh', 'ex'],
  additional_services: ['interior_cleaning', 'glass_coating', 'wheel_coating'],
  payment_methods: ['cash', 'credit_card', 'paypay', 'line_pay', 'rakuten_pay'],
  campaign_info:
    '梅雨前コーティングキャンペーン: ダイヤモンドKeePer 全車種20%OFF (〜2026/6/30)。新車割引: 初年度登録から1年以内の車両は追加で5,000円OFF。',
  staff_roster: [
    {
      photo: [{ url: 'https://example.test/staff_yamada.jpg', path: 'store_survey/staff_yamada.jpg', contentType: 'image/jpeg' }],
      name: '山田 太郎',
      role: 'manager',
      keeper_cert: '1kyu',
      other_certs: '自動車整備士2級、危険物取扱者乙種4類',
      awards: '2024 / KeePer技術コンテスト全国大会 / 準優勝',
      comment: 'お客様の大切なお車を、丁寧かつ迅速に仕上げます。',
    },
    {
      photo: [{ url: 'https://example.test/staff_sato.jpg', path: 'store_survey/staff_sato.jpg', contentType: 'image/jpeg' }],
      name: '佐藤 花子',
      role: 'chief_engineer',
      keeper_cert: '2kyu',
      other_certs: 'カーケア技術者1級',
      awards: '2024 / KeePer技術コンテスト関東大会 / 3位入賞',
      comment: '女性目線で内装も外装も細部までこだわります。',
    },
  ],
  store_intro:
    'KeePer PRO SHOP 横浜店は、横浜駅から徒歩7分の好立地にある KeePer LABO 認定店舗です。創業10年、累計施工台数12,000台以上の実績を持ちます。',
  manager_message:
    'お客様の大切な愛車を、新車の輝き以上に仕上げることをお約束します。',
  store_strengths:
    '・技術検定1級スタッフが常駐\n・女性スタッフ在籍\n・完全予約制で待ち時間ゼロ\n・代車5台完備 (無料)',
  exterior_photos: [
    { url: 'https://example.test/exterior_01.jpg', path: 'store_survey/exterior_01.jpg', contentType: 'image/jpeg' },
    { url: 'https://example.test/exterior_02.jpg', path: 'store_survey/exterior_02.jpg', contentType: 'image/jpeg' },
  ],
  work_area_photos: [
    { url: 'https://example.test/work_01.jpg', path: 'store_survey/work_01.jpg', contentType: 'image/jpeg' },
  ],
  staff_group_photo: [
    { url: 'https://example.test/staff_group.jpg', path: 'store_survey/staff_group.jpg', contentType: 'image/jpeg' },
  ],
  award_certificates: [
    // Image award → becomes a Certification; PDF award → skipped (block renders <img>).
    { url: 'https://example.test/award_2024.jpg', path: 'store_survey/award_2024.jpg', contentType: 'image/jpeg' },
    { url: 'https://example.test/award_2024.pdf', path: 'store_survey/award_2024.pdf', contentType: 'application/pdf' },
  ],
};
