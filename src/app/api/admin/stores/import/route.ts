import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { parseCsv, validateStoreRow, computeDiff, type RowResult, type FieldDiff } from '@/lib/csv-import';
import { createImport, snapshotDocs, markCommitted, pruneOldImports } from '@/lib/import-backups';

const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10 MB
const STORES_COLLECTION = 'stores';

type PreviewRow = RowResult & {
  action: 'update' | 'create' | 'error' | 'forbidden';
  diff: FieldDiff[];
};

type PreviewResponse = {
  summary: { totalRows: number; willUpdate: number; willCreate: number; errors: number; forbidden: number };
  rows: PreviewRow[];
  unknownColumns: string[];
  parseErrors: string[];
};

type CommitResponse = {
  success: true;
  importId: string;
  committed: number;
  skipped: number;
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const formData = await req.formData();
  const file = formData.get('file');
  const mode = formData.get('mode');

  if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_CSV_SIZE) {
    return NextResponse.json({ error: `File must be between 1 byte and ${MAX_CSV_SIZE / 1024 / 1024} MB` }, { status: 400 });
  }
  if (mode !== 'preview' && mode !== 'commit') {
    return NextResponse.json({ error: 'mode must be "preview" or "commit"' }, { status: 400 });
  }

  const text = await file.text();
  const { rows, columns, parseErrors } = parseCsv(text);
  if (rows.length === 0) return NextResponse.json({ error: 'CSV contains no data rows' }, { status: 400 });

  // Collect unknown columns across header
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
  ]);
  const headerUnknowns = columns.filter((c) => !knownColumns.has(c));

  // Validate each row and fetch existing docs for diff
  const db = getAdminDb();
  const rowResults: PreviewRow[] = [];
  const storeIds = new Set<string>();
  for (const [idx, row] of rows.entries()) {
    const result = validateStoreRow(row, idx + 2); // +2: header is row 1, data starts row 2
    if (result.storeId) storeIds.add(result.storeId);
    rowResults.push({ ...result, action: 'error', diff: [] });
  }

  // Batch-fetch existing store docs
  const idArr = Array.from(storeIds);
  const existingMap = new Map<string, Partial<V3StoreDataLike>>();
  if (idArr.length > 0) {
    const refs = idArr.map((id) => db.collection(STORES_COLLECTION).doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) existingMap.set(snap.id, snap.data() ?? {});
    });
  }

  // Decide action per row + compute diff + per-store-admin permission check
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
      { error: `Refusing to commit: ${summary.errors} errors and ${summary.forbidden} forbidden rows. Fix or remove those rows first.` },
      { status: 400 },
    );
  }

  const commitableIds = rowResults.filter((r) => r.action === 'update' || r.action === 'create').map((r) => r.storeId!);
  if (commitableIds.length === 0) {
    return NextResponse.json({ error: 'Nothing to commit' }, { status: 400 });
  }

  // 1. Create import record + snapshot
  const importId = await createImport('stores', {
    createdBy: user.email || user.uid,
    note: `CSV import: ${file.name}`,
  });
  await snapshotDocs(importId, 'stores', commitableIds);

  // 2. Write the updates
  const bulk = db.bulkWriter();
  let committed = 0;
  for (const r of rowResults) {
    if (r.action !== 'update' && r.action !== 'create') continue;
    const ref = db.collection(STORES_COLLECTION).doc(r.storeId!);
    // Creates: merge updates with store_id as the doc id; Updates: merge-only
    const data = { store_id: r.storeId, ...r.updates };
    bulk.set(ref, data, { merge: true });
    committed++;
  }
  await bulk.close();
  await markCommitted(importId);

  // 3. Housekeeping: keep only last 10 imports
  await pruneOldImports(10);

  return NextResponse.json({
    success: true,
    importId,
    committed,
    skipped: summary.totalRows - committed,
  });
}

// Local type alias so we don't drag the whole V3StoreData here
type V3StoreDataLike = Record<string, unknown>;
