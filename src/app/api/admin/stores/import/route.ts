import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import {
  parseCsv,
  validateStoreRow,
  computeDiff,
  extractImageRefs,
  classifyImageValue,
  type RowResult,
  type FieldDiff,
  type ExtractedImages,
} from '@/lib/csv-import';
import { createImport, snapshotDocs, markCommitted, markFailed, pruneOldImports } from '@/lib/import-backups';
import JSZip from 'jszip';
import { randomUUID } from 'node:crypto';
import { nanoid } from 'nanoid';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB (covers ZIPs with dozens of images)
const STORES_COLLECTION = 'stores';

type ImageResolutionStatus = 'url' | 'file-ok' | 'file-missing' | 'no-zip';
type ImageResolution = {
  field: string; // 'hero_image_url' | 'banner1' | 'gallery[0]' | ...
  rawValue: string;
  status: ImageResolutionStatus;
  resolvedUrl?: string; // URL after upload (commit) or echoed URL (preview)
};

type PreviewRow = RowResult & {
  action: 'update' | 'create' | 'error' | 'forbidden';
  diff: FieldDiff[];
  imageResolutions: ImageResolution[];
};

/** Detect ZIP by content-type or filename extension. */
function isZipFile(file: File): boolean {
  if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') return true;
  return /\.zip$/i.test(file.name);
}

async function loadZip(file: File): Promise<{ csvText: string | null; images: Map<string, JSZip.JSZipObject> }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const images = new Map<string, JSZip.JSZipObject>();
  let csvText: string | null = null;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lowerPath = path.toLowerCase();
    // First .csv at any depth becomes the data CSV
    if (csvText === null && lowerPath.endsWith('.csv')) {
      csvText = await entry.async('text');
      continue;
    }
    // Images under images/ folder (any case)
    if (/^images\//i.test(path)) {
      const filename = path.slice(path.indexOf('/') + 1); // strip "images/"
      if (filename) images.set(filename.toLowerCase(), entry);
    }
  }
  return { csvText, images };
}

const MIME_FROM_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function extFromFilename(name: string): string | null {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Resolve image references for a single row. */
function resolveRowImages(
  extracted: ExtractedImages,
  imagesManifest: Map<string, JSZip.JSZipObject> | null,
): { resolutions: ImageResolution[]; errors: string[] } {
  const resolutions: ImageResolution[] = [];
  const errors: string[] = [];

  const resolve = (field: string, value: string) => {
    const kind = classifyImageValue(value);
    if (kind === 'empty') return;
    if (kind === 'url') {
      resolutions.push({ field, rawValue: value, status: 'url', resolvedUrl: value });
      return;
    }
    // kind === 'file'
    if (!imagesManifest) {
      resolutions.push({ field, rawValue: value, status: 'no-zip' });
      errors.push(`${field}: "${value}" is a filename but no ZIP bundle was uploaded (use full URL or upload a ZIP containing images/)`);
      return;
    }
    const entry = imagesManifest.get(value.toLowerCase());
    if (!entry) {
      resolutions.push({ field, rawValue: value, status: 'file-missing' });
      errors.push(`${field}: file "${value}" not found in ZIP's images/ folder`);
      return;
    }
    resolutions.push({ field, rawValue: value, status: 'file-ok' });
  };

  extracted.singles.forEach((r) => resolve(r.field, r.value));
  extracted.banners.forEach((b) => resolve(`banner${b.slot}`, b.value));
  extracted.gallery.forEach((v, i) => resolve(`gallery[${i}]`, v));

  return { resolutions, errors };
}

/** Upload a single ZIP image entry to Firebase Storage and return the public URL. */
async function uploadZipImage(
  entry: JSZip.JSZipObject,
  storeId: string,
  filename: string,
): Promise<string> {
  const buffer = await entry.async('nodebuffer');
  const ext = extFromFilename(filename) || 'jpg';
  const contentType = MIME_FROM_EXT[ext] || 'image/jpeg';
  const bucket = getAdminStorage().bucket();
  // Path: stores/<storeId>/<nanoid>-<original> — avoids filename collisions on re-imports
  const key = `stores/${storeId}/${nanoid(10)}-${filename}`;
  const downloadToken = randomUUID();
  await bucket.file(key).save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(key)}?alt=media&token=${downloadToken}`;
}

/** Build the final Firestore updates object, resolving image columns to URLs. */
function buildFinalUpdates(
  baseUpdates: Record<string, unknown>,
  extracted: ExtractedImages,
  resolutions: ImageResolution[],
): Record<string, unknown> {
  const final: Record<string, unknown> = { ...baseUpdates };
  const urlByField = new Map<string, string>();
  for (const r of resolutions) {
    if (r.resolvedUrl) urlByField.set(r.field, r.resolvedUrl);
  }

  // Single image columns
  for (const ref of extracted.singles) {
    const url = urlByField.get(ref.field);
    if (url) final[ref.field] = url;
  }

  // Promo banners: explicit JSON wins; else assemble from banner1..4
  if (extracted.explicitPromoBannersJson) {
    final.promo_banners = extracted.explicitPromoBannersJson;
  } else if (extracted.banners.length > 0) {
    // Build a 4-slot array; unchanged slots stay empty (per-slot merge lives in PromoBannersBlock)
    const slots: { src: string; alt?: string }[] = [];
    for (let i = 1; i <= 4; i++) {
      const ref = extracted.banners.find((b) => b.slot === i);
      if (ref) {
        const url = urlByField.get(`banner${i}`);
        slots.push({ src: url || '' });
      } else {
        slots.push({ src: '' });
      }
    }
    final.promo_banners = JSON.stringify(slots);
  }

  // Gallery: explicit JSON wins; else assemble from gallery pipe-separated
  if (extracted.explicitGalleryJson) {
    final.gallery_images = extracted.explicitGalleryJson;
  } else if (extracted.gallery.length > 0) {
    const urls = extracted.gallery.map((_, i) => urlByField.get(`gallery[${i}]`)).filter(Boolean);
    if (urls.length > 0) final.gallery_images = JSON.stringify(urls);
  }

  return final;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const formData = await req.formData();
  const file = formData.get('file');
  const mode = formData.get('mode');

  if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: `File must be between 1 byte and ${MAX_UPLOAD_SIZE / 1024 / 1024} MB` }, { status: 400 });
  }
  if (mode !== 'preview' && mode !== 'commit') {
    return NextResponse.json({ error: 'mode must be "preview" or "commit"' }, { status: 400 });
  }

  // ─── Parse input (CSV or ZIP) ───
  let csvText: string;
  let imagesManifest: Map<string, JSZip.JSZipObject> | null = null;

  if (isZipFile(file)) {
    const zip = await loadZip(file);
    if (!zip.csvText) return NextResponse.json({ error: 'ZIP does not contain a .csv file' }, { status: 400 });
    csvText = zip.csvText;
    imagesManifest = zip.images;
  } else {
    csvText = await file.text();
  }

  const { rows, columns, parseErrors } = parseCsv(csvText);
  if (rows.length === 0) return NextResponse.json({ error: 'CSV contains no data rows' }, { status: 400 });

  // Known columns set used for "unknown column" warning at header level.
  const knownColumns = new Set([
    'store_id', 'store_name', 'is_active', 'address', 'postal_code', 'prefecture', 'city',
    'tel', 'business_hours', 'regular_holiday', 'email', 'line_url', 'lat', 'lng',
    'parking_spaces', 'landmark', 'nearby_stations', 'access_map_url', 'campaign_title',
    'campaign_deadline', 'discount_rate', 'campaign_color_code', 'hero_title', 'hero_subtitle',
    'description', 'meta_description', 'seo_keywords', 'hero_image_url', 'logo_url',
    'staff_photo_url', 'store_exterior_url', 'store_interior_url', 'before_after_url',
    'campaign_banner_url', 'gallery_images', 'custom_services', 'price_multiplier',
    'min_price_limit', 'has_booth', 'level1_staff_count', 'level2_staff_count', 'google_place_id',
    'page_layout', 'blur_config', 'appeal_points', 'certifications', 'store_news', 'banners',
    'sub_company_id', 'store_slug', 'custom_css', 'estimate_enabled', 'qr_code_enabled',
    'font_family', 'price_overrides', 'guide_config', 'promo_banners',
    // Phase 6 convenience columns
    'banner1', 'banner2', 'banner3', 'banner4', 'gallery',
  ]);
  const headerUnknowns = columns.filter((c) => !knownColumns.has(c));

  // ─── Validate each row + resolve image refs ───
  const db = getAdminDb();
  const rowResults: PreviewRow[] = [];
  const storeIds = new Set<string>();

  for (const [idx, row] of rows.entries()) {
    const validated = validateStoreRow(row, idx + 2);
    const extracted = extractImageRefs(row);
    const resolved = resolveRowImages(extracted, imagesManifest);
    if (validated.storeId) storeIds.add(validated.storeId);
    rowResults.push({
      ...validated,
      errors: [...validated.errors, ...resolved.errors],
      action: 'error',
      diff: [],
      imageResolutions: resolved.resolutions,
    });
  }

  // Fetch existing docs
  const existingMap = new Map<string, Record<string, unknown>>();
  const idArr = Array.from(storeIds);
  if (idArr.length > 0) {
    const refs = idArr.map((id) => db.collection(STORES_COLLECTION).doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) existingMap.set(snap.id, snap.data() ?? {});
    });
  }

  // Determine action + diff per row. Note: image URLs in diff are shown as
  // "(ZIPからアップロード: filename.jpg)" until commit. For preview we compute
  // the diff on non-image fields + show image changes separately.
  const summary = { totalRows: rowResults.length, willUpdate: 0, willCreate: 0, errors: 0, forbidden: 0 };
  for (const r of rowResults) {
    if (r.errors.length > 0 || !r.storeId) {
      r.action = 'error';
      summary.errors++;
      continue;
    }
    if (!canManageStore(user, r.storeId)) {
      r.action = 'forbidden';
      r.errors.push(`You do not have permission to modify store "${r.storeId}"`);
      summary.forbidden++;
      continue;
    }
    const existing = existingMap.get(r.storeId);
    r.diff = computeDiff(existing ?? null, r.updates);
    r.action = existing ? 'update' : 'create';
    if (existing) summary.willUpdate++;
    else summary.willCreate++;
  }

  if (mode === 'preview') {
    return NextResponse.json({ summary, rows: rowResults, unknownColumns: headerUnknowns, parseErrors });
  }

  // ─── Commit mode ───
  if (summary.errors > 0 || summary.forbidden > 0) {
    return NextResponse.json(
      { error: `Refusing to commit: ${summary.errors} errors and ${summary.forbidden} forbidden rows.` },
      { status: 400 },
    );
  }

  const commitableIds = rowResults
    .filter((r) => r.action === 'update' || r.action === 'create')
    .map((r) => r.storeId!);
  if (commitableIds.length === 0) {
    return NextResponse.json({ error: 'Nothing to commit' }, { status: 400 });
  }

  // 1. Snapshot
  const importId = await createImport('stores', {
    createdBy: user.email || user.uid,
    note: `CSV import: ${file.name}`,
  });
  await snapshotDocs(importId, 'stores', commitableIds);

  // 2. Upload ZIP images (dedupe: same filename referenced multiple times uploads once per store).
  //    Key: `${storeId}|${filename.toLowerCase()}`
  const uploadCache = new Map<string, string>();
  const uploadErrors: string[] = [];

  for (const r of rowResults) {
    if (r.action !== 'update' && r.action !== 'create') continue;
    for (const res of r.imageResolutions) {
      if (res.status !== 'file-ok') continue;
      const cacheKey = `${r.storeId}|${res.rawValue.toLowerCase()}`;
      if (uploadCache.has(cacheKey)) {
        res.resolvedUrl = uploadCache.get(cacheKey);
        continue;
      }
      const entry = imagesManifest!.get(res.rawValue.toLowerCase())!;
      try {
        const url = await uploadZipImage(entry, r.storeId!, res.rawValue);
        uploadCache.set(cacheKey, url);
        res.resolvedUrl = url;
      } catch (err) {
        uploadErrors.push(`Upload failed for "${res.rawValue}": ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
  }
  if (uploadErrors.length > 0) {
    return NextResponse.json(
      { error: `Upload failures — aborted before writing Firestore. Snapshot ${importId} preserved. Errors: ${uploadErrors.join('; ')}` },
      { status: 500 },
    );
  }

  // 3. Write Firestore with resolved image URLs merged in
  const bulk = db.bulkWriter();
  const writeFailures: string[] = [];
  bulk.onWriteError((err) => {
    if (err.failedAttempts < 5) return true;
    writeFailures.push(`${err.documentRef.path}: ${err.message}`);
    return false;
  });
  let committed = 0;
  for (const r of rowResults) {
    if (r.action !== 'update' && r.action !== 'create') continue;
    const row = rows[r.rowNumber - 2];
    const extracted = extractImageRefs(row);
    const finalUpdates = buildFinalUpdates(r.updates as Record<string, unknown>, extracted, r.imageResolutions);
    const data = { store_id: r.storeId, ...finalUpdates };
    bulk.set(db.collection(STORES_COLLECTION).doc(r.storeId!), data, { merge: true });
    committed++;
  }
  await bulk.close();

  if (writeFailures.length > 0) {
    const reason = writeFailures.join('; ');
    await markFailed(importId, reason);
    return NextResponse.json(
      {
        error: `Partial commit — ${writeFailures.length} of ${committed} writes failed. Import ${importId} is marked "failed"; restore from /admin/imports to revert. Errors: ${reason}`,
        importId,
        failures: writeFailures,
      },
      { status: 500 },
    );
  }

  await markCommitted(importId);
  await pruneOldImports(10);

  return NextResponse.json({
    success: true,
    importId,
    committed,
    skipped: summary.totalRows - committed,
    imagesUploaded: uploadCache.size,
  });
}
