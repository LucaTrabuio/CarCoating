import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import {
  parseCsv,
  validateBlogRow,
  computeDiff,
  classifyImageValue,
  type FieldDiff,
} from '@/lib/csv-import';
import { createImport, snapshotDocs, markCommitted, pruneOldImports } from '@/lib/import-backups';
import JSZip from 'jszip';
import { randomUUID } from 'node:crypto';
import { nanoid } from 'nanoid';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const BLOG_COLLECTION = 'blog_posts';

type ImageResolutionStatus = 'url' | 'file-ok' | 'file-missing' | 'no-zip';
type PreviewRow = {
  rowNumber: number;
  slug: string | null;
  action: 'update' | 'create' | 'error';
  targetDocId: string | null; // existing doc id, or new id (slug) for creates
  diff: FieldDiff[];
  errors: string[];
  unknownColumns: string[];
  heroImage?: { raw: string; status: ImageResolutionStatus; resolvedUrl?: string };
};

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
    if (csvText === null && path.toLowerCase().endsWith('.csv')) {
      csvText = await entry.async('text');
      continue;
    }
    if (/^images\//i.test(path)) {
      const filename = path.slice(path.indexOf('/') + 1);
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

async function uploadZipImage(entry: JSZip.JSZipObject, slug: string, filename: string): Promise<string> {
  const buffer = await entry.async('nodebuffer');
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] || 'jpg').toLowerCase();
  const contentType = MIME_FROM_EXT[ext] || 'image/jpeg';
  const bucket = getAdminStorage().bucket();
  const key = `blog/${slug}/${nanoid(10)}-${filename}`;
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

export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
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

  const knownColumns = new Set([
    'slug', 'title', 'summary', 'content', 'hero_image',
    'category', 'published', 'publishDate', 'metaTitle', 'metaDescription',
  ]);
  const headerUnknowns = columns.filter((c) => !knownColumns.has(c));

  // ─── Validate rows + resolve hero_image ───
  const db = getAdminDb();
  const rowResults: PreviewRow[] = [];

  for (const [idx, row] of rows.entries()) {
    const validated = validateBlogRow(row, idx + 2);
    const pr: PreviewRow = {
      rowNumber: validated.rowNumber,
      slug: validated.slug,
      action: 'error',
      targetDocId: null,
      diff: [],
      errors: [...validated.errors],
      unknownColumns: validated.unknownColumns,
    };

    // Resolve hero_image
    if (validated.heroImageRaw) {
      const kind = classifyImageValue(validated.heroImageRaw);
      if (kind === 'url') {
        pr.heroImage = { raw: validated.heroImageRaw, status: 'url', resolvedUrl: validated.heroImageRaw };
      } else if (kind === 'file') {
        if (!imagesManifest) {
          pr.heroImage = { raw: validated.heroImageRaw, status: 'no-zip' };
          pr.errors.push(`hero_image: "${validated.heroImageRaw}" is a filename but no ZIP uploaded`);
        } else if (!imagesManifest.has(validated.heroImageRaw.toLowerCase())) {
          pr.heroImage = { raw: validated.heroImageRaw, status: 'file-missing' };
          pr.errors.push(`hero_image: "${validated.heroImageRaw}" not in ZIP's images/`);
        } else {
          pr.heroImage = { raw: validated.heroImageRaw, status: 'file-ok' };
        }
      }
    }

    // Store validated updates on the row for later (not surfacing in PreviewRow shape directly)
    (pr as PreviewRow & { _updates: Record<string, unknown> })._updates = validated.updates;
    rowResults.push(pr);
  }

  // ─── Resolve slug → existing docId (for upsert) ───
  const slugs = rowResults.map((r) => r.slug).filter((s): s is string => !!s);
  const existingBySlug = new Map<string, { id: string; data: Record<string, unknown> }>();
  if (slugs.length > 0) {
    // Firestore "in" queries are limited to 30 values — chunk
    const CHUNK = 30;
    for (let i = 0; i < slugs.length; i += CHUNK) {
      const slice = slugs.slice(i, i + CHUNK);
      const snap = await db.collection(BLOG_COLLECTION).where('slug', 'in', slice).get();
      snap.docs.forEach((d) => existingBySlug.set((d.data() as { slug: string }).slug, { id: d.id, data: d.data() }));
    }
  }

  // ─── Decide action + diff ───
  const summary = { totalRows: rowResults.length, willUpdate: 0, willCreate: 0, errors: 0 };
  for (const r of rowResults) {
    if (r.errors.length > 0 || !r.slug) {
      r.action = 'error';
      summary.errors++;
      continue;
    }
    const existing = existingBySlug.get(r.slug);
    if (existing) {
      r.action = 'update';
      r.targetDocId = existing.id;
      summary.willUpdate++;
    } else {
      r.action = 'create';
      r.targetDocId = r.slug;
      summary.willCreate++;
    }
    const updates = (r as PreviewRow & { _updates: Record<string, unknown> })._updates;
    r.diff = computeDiff(existing?.data ?? null, updates);
  }

  if (mode === 'preview') {
    // Strip internal _updates before returning
    rowResults.forEach((r) => { delete (r as PreviewRow & { _updates?: unknown })._updates; });
    return NextResponse.json({ summary, rows: rowResults, unknownColumns: headerUnknowns, parseErrors });
  }

  // ─── Commit ───
  if (summary.errors > 0) {
    return NextResponse.json({ error: `Refusing to commit: ${summary.errors} errors.` }, { status: 400 });
  }
  const commitable = rowResults.filter((r) => r.action === 'update' || r.action === 'create');
  if (commitable.length === 0) return NextResponse.json({ error: 'Nothing to commit' }, { status: 400 });

  const importId = await createImport('blog_posts', {
    createdBy: user.email || user.uid,
    note: `Blog CSV import: ${file.name}`,
  });
  const targetDocIds = commitable.map((r) => r.targetDocId!);
  await snapshotDocs(importId, 'blog_posts', targetDocIds);

  // Upload hero images (one-shot, no dedup needed — 1 per post)
  const uploadErrors: string[] = [];
  for (const r of commitable) {
    if (!r.heroImage || r.heroImage.status !== 'file-ok') continue;
    try {
      const entry = imagesManifest!.get(r.heroImage.raw.toLowerCase())!;
      r.heroImage.resolvedUrl = await uploadZipImage(entry, r.slug!, r.heroImage.raw);
    } catch (err) {
      uploadErrors.push(`${r.slug}: ${err instanceof Error ? err.message : 'upload failed'}`);
    }
  }
  if (uploadErrors.length > 0) {
    return NextResponse.json(
      { error: `Upload failures — aborted before Firestore writes. Snapshot ${importId} preserved. ${uploadErrors.join('; ')}` },
      { status: 500 },
    );
  }

  // Write Firestore
  const bulk = db.bulkWriter();
  const now = new Date().toISOString();
  let committed = 0;
  for (const r of commitable) {
    const updates = (r as PreviewRow & { _updates: Record<string, unknown> })._updates;
    const ref = db.collection(BLOG_COLLECTION).doc(r.targetDocId!);
    const data: Record<string, unknown> = { slug: r.slug, ...updates, updated_at: now };
    if (r.heroImage?.resolvedUrl) data.hero_image_url = r.heroImage.resolvedUrl;
    if (r.action === 'create') {
      data.created_at = now;
      data.author_uid = user.uid;
    }
    bulk.set(ref, data, { merge: true });
    committed++;
  }
  await bulk.close();
  await markCommitted(importId);
  await pruneOldImports(10);

  return NextResponse.json({
    success: true,
    importId,
    committed,
    skipped: summary.totalRows - committed,
  });
}
