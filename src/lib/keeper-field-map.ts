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
