// Keeper (Meets-SPI) External API — TypeScript type definitions.
// Field names and nullability match the OpenAPI schema exactly.

// ─── Keeper API types ─────────────────────────────────────────

export type SurveyStatus = 'draft' | 'published' | 'closed';

export interface Survey {
  survey_id: string;
  title: string;
  status: SurveyStatus;
  response_count: number;
  created_at: string | null;
  updated_at: string | null;
  expires_at: string | null;
}

export interface SurveyListResponse {
  items: Survey[];
  next_cursor: string | null;
}

export interface FileRef {
  file_id: string;
  field_id: string;
  content_type: string | null;
  size: number | null;
  filename: string | null;
  download_url: string;
}

export interface PortraitRightsSigner {
  name?: string;
  role?: string;
  affiliation?: string;
}

export interface SurveyResponse {
  response_id: string;
  respondent_token: string | null;
  store_id: string | null;
  store_name: string | null;
  submitted_at: string | null;
  revision: number;
  answers: Record<string, unknown>;
  files: FileRef[];
  portrait_rights_signers: PortraitRightsSigner[];
}

export interface ResponseListPage {
  survey_id: string;
  items: SurveyResponse[];
  next_cursor: string | null;
}

// ─── Error type ───────────────────────────────────────────────

export type KeeperErrorCode =
  | 'invalid_credentials'
  | 'forbidden'
  | 'not_found'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error'
  | 'service_unavailable';

export interface KeeperApiError extends Error {
  code: KeeperErrorCode | string;
  requestId: string | null;
  status: number;
  /**
   * Compact server diagnostic for 503 file/CSV signing failures, e.g.
   * `missing_role_token_creator`. Sourced from the error body's `message`
   * (`hint=<tag>`) or the `X-MeetsSPI-Sign-Fallback` header. A diagnostic
   * tag only — never PII.
   */
  hint?: string | null;
}

// ─── Firestore document types ─────────────────────────────────

export type MatchStatus = 'matched' | 'unmatched';

export interface MirroredFile {
  storagePath: string;
  contentType: string;
  size: number;
  mirroredAt: string;
}

/** What we persist in keeperSurveys/{surveyId} */
export interface KeeperSurveyDoc extends Survey {
  syncedAt: string;
}

/** What we persist in keeperSurveys/{surveyId}/responses/{responseId} */
export interface KeeperResponseDoc
  extends Omit<SurveyResponse, 'files'> {
  surveyId: string;
  matchedStoreId: string | null;
  matchStatus: MatchStatus;
  files: (FileRef & { mirrored?: MirroredFile })[];
  syncedAt: string;
}

/** keeperSync/state doc */
export interface KeeperSyncState {
  lastSurveysSyncAt: string | null;
  /** keyed by surveyId */
  lastResponsesSyncAt: Record<string, string>;
  updatedAt: string;
}

/** Return value of syncKeeperSurveys */
export interface KeeperSyncResult {
  surveys: number;
  responses: number;
  filesMirrored: number;
  unmatched: number;
}

// ─── Per-run sync summary ────────────────────────────────────

export interface KeeperSyncStoreSummary {
  storeName: string;
  keeperStoreId: string | null;
  matchedStoreId: string | null;
  matchStatus: MatchStatus;
  newResponses: number;
  filledFields: string[];
}

/** keeperSync/lastRun doc */
export interface KeeperSyncLastRun {
  ranAt: string;
  trigger: 'cron' | 'manual';
  surveysProcessed: number;
  responsesProcessed: number;
  filesMirrored: number;
  stores: KeeperSyncStoreSummary[];
}

// ─── Field-label map (UI copy — fine to inline per CLAUDE.md §1) ─

export const KEEPER_FIELD_LABELS: Record<string, string> = {
  store_name_full: '店舗名（正式名称）',
  store_name_short: '店舗名（呼称）',
  phone: '電話番号',
  email: 'メールアドレス',
  address_zip: '郵便番号',
  address_line: '住所',
  business_hours: '営業時間',
  closed_days_notes: '定休日・補足',
  google_map_url: 'GoogleマップURL',
  google_place_id: 'Google Place ID',
  nearest_station: '最寄り駅・バス停',
  road_access: '幹線道路・ICアクセス',
  landmarks: '周辺ランドマーク',
  keeper_rank: 'KeePer認定ランク',
  booth_count: '施工ブース数',
  simultaneous_capacity: '同時施工可能台数',
  vehicle_types: '対応可能車種',
  coating_menu: '取扱コーティングメニュー',
  additional_services: '付帯サービス',
  payment_methods: '支払い方法',
  campaign_info: 'キャンペーン・割引情報',
  staff_roster: 'スタッフ一覧',
  store_intro: '店舗紹介文',
  manager_message: '店長メッセージ',
  store_strengths: '店舗の強み・こだわり',
  exterior_photos: '外観写真',
  exterior_photos2: '外観写真2',
  work_area_photos: '施工エリア写真',
  staff_group_photo: 'スタッフ集合写真',
  award_certificates: '受賞・認定証',
};
