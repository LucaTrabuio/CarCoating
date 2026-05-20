// Keeper (Meets-SPI) survey sync orchestration — server-side only.
// NEVER log answers, respondent_token, or the HMAC secret.

import { getAdminDb, getAdminStorage } from './firebase-admin';
import { getAllV3StoresIncludingInactive } from './firebase-stores';
import { systemAlerts } from './system-alerts-instance';
import {
  listSurveys,
  listResponses,
  fetchFileBinary,
} from './keeper-client';
import type {
  KeeperSyncState,
  KeeperSyncResult,
  KeeperResponseDoc,
  KeeperSurveyDoc,
  FileRef,
  MirroredFile,
  MatchStatus,
  KeeperSyncStoreSummary,
  KeeperSyncLastRun,
} from './keeper-types';

// ─── Store name normalisation ────────────────────────────────

export function normalizeStoreName(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
}

async function buildStoreNameMap(): Promise<Map<string, string>> {
  const stores = await getAllV3StoresIncludingInactive();
  const map = new Map<string, string>();
  for (const store of stores) {
    if (store.store_name) {
      map.set(normalizeStoreName(store.store_name), store.store_id);
    }
  }
  return map;
}

// ─── Inline concurrency limiter (no external dep) ────────────

function makeLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        running++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--;
            if (queue.length > 0) {
              const next = queue.shift()!;
              next();
            }
          });
      };
      if (running < concurrency) {
        execute();
      } else {
        queue.push(execute);
      }
    });
  }

  return { run };
}

// ─── Filename sanitisation ────────────────────────────────────

function sanitizeFilename(name: string | null): string {
  if (!name) return 'file';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

// ─── File mirroring ───────────────────────────────────────────

async function mirrorFile(
  surveyId: string,
  responseId: string,
  fileRef: FileRef,
): Promise<MirroredFile> {
  const { buffer, contentType } = await fetchFileBinary(
    surveyId,
    fileRef.file_id,
  );

  const sanitized = sanitizeFilename(fileRef.filename);
  const storagePath = `keeper-surveys/${surveyId}/${responseId}/${fileRef.file_id}_${sanitized}`;

  const storage = getAdminStorage();
  const fileObj = storage.bucket().file(storagePath);

  await fileObj.save(buffer, {
    contentType,
    resumable: false,
    // No makePublic() — private by default
  });

  return {
    storagePath,
    contentType,
    size: buffer.length,
    mirroredAt: new Date().toISOString(),
  };
}

// ─── computeFilledFields — exported for tests ─────────────────
// Returns only the KEYS of answers whose value is non-empty.
// NEVER returns answer values — PII boundary.
export function computeFilledFields(answers: Record<string, unknown>): string[] {
  const filled: string[] = [];
  for (const [key, val] of Object.entries(answers)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string' && val.trim() === '') continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (
      typeof val === 'object' &&
      !Array.isArray(val) &&
      Object.keys(val as Record<string, unknown>).length === 0
    ) continue;
    filled.push(key);
  }
  return filled;
}

// ─── Main sync orchestration ──────────────────────────────────

export async function syncKeeperSurveys(opts: {
  full?: boolean;
  trigger?: 'cron' | 'manual';
} = {}): Promise<KeeperSyncResult> {
  const trigger = opts.trigger ?? 'cron';
  const db = getAdminDb();
  const result: KeeperSyncResult = {
    surveys: 0,
    responses: 0,
    filesMirrored: 0,
    unmatched: 0,
  };

  // Accumulator for per-run store summaries (keyed by store_id ?? store_name ?? '(unknown)')
  const storeSummaryMap = new Map<string, KeeperSyncStoreSummary & {
    _latestRevision: number;
    _latestSubmittedAt: string | null;
  }>();

  // 1. Load cursor state
  const stateRef = db.collection('keeperSync').doc('state');
  let state: KeeperSyncState = {
    lastSurveysSyncAt: null,
    lastResponsesSyncAt: {},
    updatedAt: new Date().toISOString(),
  };
  try {
    const stateSnap = await stateRef.get();
    if (stateSnap.exists) {
      state = stateSnap.data() as KeeperSyncState;
    }
  } catch (err) {
    console.error('[keeper-sync] Failed to load sync state:', err);
    // Continue with empty state — full sync fallback
  }

  // 2. Build store name map for auto-linking
  let storeNameMap: Map<string, string> = new Map();
  try {
    storeNameMap = await buildStoreNameMap();
  } catch (err) {
    console.error('[keeper-sync] Failed to build store name map:', err);
    // Continue — responses will have matchStatus:'unmatched'
  }

  // 3. Page through surveys
  let surveysCursor: string | null = null;
  const updatedSince =
    opts.full ? undefined : (state.lastSurveysSyncAt ?? undefined);

  const syncStartTime = new Date().toISOString();

  do {
    let page;
    try {
      page = await listSurveys({
        limit: 100,
        cursor: surveysCursor ?? undefined,
        updatedSince,
      });
    } catch (err) {
      console.error('[keeper-sync] listSurveys failed:', err);
      await recordSurveyAlert('Failed to list surveys', err, {});
      break;
    }

    for (const survey of page.items) {
      // Upsert survey doc
      try {
        const surveyDoc: KeeperSurveyDoc = {
          ...survey,
          syncedAt: syncStartTime,
        };
        await db
          .collection('keeperSurveys')
          .doc(survey.survey_id)
          .set(surveyDoc, { merge: true });
        result.surveys++;
      } catch (err) {
        console.error(
          `[keeper-sync] Failed to upsert survey ${survey.survey_id}:`,
          err,
        );
        await recordSurveyAlert('Failed to upsert survey', err, {
          surveyId: survey.survey_id,
        });
        continue;
      }

      // 4. Page through responses for this survey
      await syncResponsesForSurvey(
        survey.survey_id,
        state,
        storeNameMap,
        result,
        opts.full ?? false,
        syncStartTime,
        storeSummaryMap,
      );
    }

    surveysCursor = page.next_cursor;
  } while (surveysCursor);

  // 5. Write updated cursors
  try {
    const newState: KeeperSyncState = {
      lastSurveysSyncAt: syncStartTime,
      lastResponsesSyncAt: state.lastResponsesSyncAt,
      updatedAt: new Date().toISOString(),
    };
    await stateRef.set(newState, { merge: true });
  } catch (err) {
    console.error('[keeper-sync] Failed to write sync state:', err);
  }

  // 6. Write per-run summary to keeperSync/lastRun (best-effort, never aborts sync)
  try {
    const stores: KeeperSyncStoreSummary[] = Array.from(
      storeSummaryMap.values(),
    ).map(({ _latestRevision: _r, _latestSubmittedAt: _s, ...summary }) => summary);

    const lastRun: KeeperSyncLastRun = {
      ranAt: syncStartTime,
      trigger,
      surveysProcessed: result.surveys,
      responsesProcessed: result.responses,
      filesMirrored: result.filesMirrored,
      stores,
    };
    await db.collection('keeperSync').doc('lastRun').set(lastRun);
  } catch (err) {
    console.error('[keeper-sync] Failed to write lastRun summary:', err);
    await recordSurveyAlert('Failed to write lastRun summary', err, {});
  }

  return result;
}

async function syncResponsesForSurvey(
  surveyId: string,
  state: KeeperSyncState,
  storeNameMap: Map<string, string>,
  result: KeeperSyncResult,
  full: boolean,
  syncStartTime: string,
  storeSummaryMap: Map<string, KeeperSyncStoreSummary & {
    _latestRevision: number;
    _latestSubmittedAt: string | null;
  }>,
): Promise<void> {
  const db = getAdminDb();
  const submittedSince =
    full ? undefined : (state.lastResponsesSyncAt[surveyId] ?? undefined);

  let cursor: string | null = null;
  const limiter = makeLimiter(10);

  do {
    let page;
    try {
      page = await listResponses(surveyId, {
        limit: 1000,
        cursor: cursor ?? undefined,
        submittedSince,
      });
    } catch (err) {
      console.error(
        `[keeper-sync] listResponses failed for survey ${surveyId}:`,
        err,
      );
      await recordSurveyAlert('Failed to list responses', err, {
        surveyId,
      });
      break;
    }

    for (const response of page.items) {
      // Auto-link to car-coating store
      const normalized = response.store_name
        ? normalizeStoreName(response.store_name)
        : null;
      const matchedStoreId =
        normalized != null ? (storeNameMap.get(normalized) ?? null) : null;
      const matchStatus: MatchStatus =
        matchedStoreId != null ? 'matched' : 'unmatched';

      if (matchStatus === 'unmatched') {
        result.unmatched++;
      }

      // Load existing response doc to check already-mirrored files
      const responseRef = db
        .collection('keeperSurveys')
        .doc(surveyId)
        .collection('responses')
        .doc(response.response_id);

      let existingDoc: KeeperResponseDoc | null = null;
      try {
        const snap = await responseRef.get();
        if (snap.exists) {
          existingDoc = snap.data() as KeeperResponseDoc;
        }
      } catch {
        // treat as no existing doc
      }

      // Mirror files (skip already-mirrored, concurrency cap 10)
      const filesMeta: (FileRef & { mirrored?: MirroredFile })[] = [];

      for (const fileRef of response.files) {
        const alreadyMirrored = existingDoc?.files?.find(
          (f) => f.file_id === fileRef.file_id && f.mirrored != null,
        );

        if (alreadyMirrored?.mirrored) {
          filesMeta.push({ ...fileRef, mirrored: alreadyMirrored.mirrored });
          continue;
        }

        // Mirror with concurrency cap
        const mirroredEntry = await limiter.run(async () => {
          try {
            const mirrored = await mirrorFile(
              surveyId,
              response.response_id,
              fileRef,
            );
            result.filesMirrored++;
            return { ...fileRef, mirrored };
          } catch (err) {
            console.error(
              `[keeper-sync] Failed to mirror file ${fileRef.file_id}:`,
              err,
            );
            await recordFileAlert('Failed to mirror file', err, {
              fileId: fileRef.file_id,
            });
            return { ...fileRef };
          }
        });

        filesMeta.push(mirroredEntry);
      }

      // Upsert response doc — NEVER store answers in alert payloads
      try {
        const responseDoc: KeeperResponseDoc = {
          response_id: response.response_id,
          respondent_token: response.respondent_token,
          store_id: response.store_id,
          store_name: response.store_name,
          submitted_at: response.submitted_at,
          revision: response.revision,
          answers: response.answers,
          portrait_rights_signers: response.portrait_rights_signers,
          surveyId,
          matchedStoreId,
          matchStatus,
          files: filesMeta,
          syncedAt: syncStartTime,
        };

        await responseRef.set(responseDoc, { merge: true });
        result.responses++;

        // Update per-store summary accumulator (keys only — no PII values)
        const summaryKey =
          response.store_id ?? response.store_name ?? '(unknown)';
        const existing = storeSummaryMap.get(summaryKey);
        if (!existing) {
          storeSummaryMap.set(summaryKey, {
            storeName: response.store_name ?? summaryKey,
            keeperStoreId: response.store_id,
            matchedStoreId,
            matchStatus,
            newResponses: 1,
            filledFields: computeFilledFields(
              response.answers as Record<string, unknown>,
            ),
            _latestRevision: response.revision,
            _latestSubmittedAt: response.submitted_at,
          });
        } else {
          existing.newResponses++;
          // Keep latest response by revision (primary), submitted_at (tiebreaker, null-safe)
          const isNewer =
            response.revision > existing._latestRevision ||
            (response.revision === existing._latestRevision &&
              (response.submitted_at ?? '') >
                (existing._latestSubmittedAt ?? ''));
          if (isNewer) {
            existing._latestRevision = response.revision;
            existing._latestSubmittedAt = response.submitted_at;
            existing.filledFields = computeFilledFields(
              response.answers as Record<string, unknown>,
            );
          }
        }
      } catch (err) {
        console.error(
          `[keeper-sync] Failed to upsert response ${response.response_id}:`,
          err,
        );
        await recordSurveyAlert('Failed to upsert response', err, {
          surveyId,
        });
      }
    }

    cursor = page.next_cursor;
  } while (cursor);

  // Update per-survey cursor
  state.lastResponsesSyncAt[surveyId] = syncStartTime;
}

// ─── Alert helpers — PII-free payloads ───────────────────────

async function recordSurveyAlert(
  title: string,
  err: unknown,
  payload: { surveyId?: string; code?: string; requestId?: string },
): Promise<void> {
  try {
    const code =
      (err as { code?: string })?.code ?? String(err).slice(0, 200);
    const requestId = (err as { requestId?: string })?.requestId ?? undefined;
    await systemAlerts.recordAlert({
      source: 'keeper-sync',
      severity: 'error',
      title: `[keeper-sync] ${title}`,
      payload: { ...payload, code, requestId },
      dedupeKey: `keeper-sync:surveys${payload.surveyId ? `:${payload.surveyId}` : ''}`,
    });
  } catch {
    // Never let alert recording abort the sync
  }
}

async function recordFileAlert(
  title: string,
  err: unknown,
  payload: { fileId?: string; code?: string },
): Promise<void> {
  try {
    const code =
      (err as { code?: string })?.code ?? String(err).slice(0, 200);
    await systemAlerts.recordAlert({
      source: 'keeper-sync',
      severity: 'error',
      title: `[keeper-sync] ${title}`,
      payload: { ...payload, code },
      dedupeKey: `keeper-sync:file:${payload.fileId ?? 'unknown'}`,
    });
  } catch {
    // Never let alert recording abort the sync
  }
}

export async function recordCriticalSyncAlert(
  title: string,
  err: unknown,
): Promise<void> {
  try {
    const code = (err as { code?: string })?.code ?? String(err).slice(0, 200);
    const requestId =
      (err as { requestId?: string })?.requestId ?? undefined;
    await systemAlerts.recordAlert({
      source: 'keeper-sync',
      severity: 'critical',
      title: `[keeper-sync] ${title}`,
      payload: { code, requestId },
      dedupeKey: 'keeper-sync:auth-failure',
    });
  } catch {
    // Never let alert recording throw
  }
}
