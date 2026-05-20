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
