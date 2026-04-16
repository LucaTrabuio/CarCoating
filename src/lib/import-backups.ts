/**
 * Import backup / rollback utility.
 *
 * Before any CSV import commits to Firestore, snapshot every doc that
 * will be touched. Two layers of backup:
 *
 *   1. Firestore: `import_backups/<importId>` (metadata doc)
 *                 `import_backups/<importId>/items/<docId>` (subcollection
 *                  with a full snapshot of each affected doc)
 *   2. Storage:  `gs://<bucket>/backups/imports/<importId>.json`
 *                 (JSON dump — belt-and-suspenders; survives even if the
 *                  Firestore collection is dropped)
 *
 * Recover from a bad import by calling `restoreImport(importId)`, which
 * batch-writes the snapshots back to their original collection. Docs
 * that did not exist pre-import are deleted on restore.
 *
 * Pruning: `pruneOldImports(keep)` removes all but the most-recent N
 * imports (Firestore subcollection + Storage JSON).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminStorage } from './firebase-admin';
import { nanoid } from 'nanoid';

export type TargetCollection = 'stores' | 'blog_posts';

export type ImportMeta = {
  importId: string;
  collection: TargetCollection;
  createdAt: number;
  createdBy?: string;
  itemCount: number;
  note?: string;
  storageBackupPath?: string;
  status: 'snapshotted' | 'committed' | 'restored' | 'failed';
};

type SnapshotItem = {
  docId: string;
  existed: boolean;
  data: FirebaseFirestore.DocumentData | null;
};

const META_COLLECTION = 'import_backups';
const ITEMS_SUBCOLLECTION = 'items';
const STORAGE_PREFIX = 'backups/imports';

/** Create a new import record and return its id. Call before snapshotting. */
export async function createImport(
  collection: TargetCollection,
  opts: { createdBy?: string; note?: string } = {},
): Promise<string> {
  const importId = `${Date.now()}-${nanoid(8)}`;
  const meta: ImportMeta = {
    importId,
    collection,
    createdAt: Date.now(),
    createdBy: opts.createdBy,
    itemCount: 0,
    note: opts.note,
    status: 'snapshotted',
  };
  await getAdminDb().collection(META_COLLECTION).doc(importId).set(meta);
  return importId;
}

/**
 * Snapshot the current state of each docId under `collection` into the
 * import record (both Firestore subcollection and Storage JSON dump).
 * Docs that don't exist yet are recorded with existed=false so restore
 * deletes them (reverting a "create").
 */
export async function snapshotDocs(
  importId: string,
  collection: TargetCollection,
  docIds: string[],
): Promise<void> {
  if (docIds.length === 0) return;
  const db = getAdminDb();

  // Read current state in parallel (getAll has no built-in chunking but
  // tolerates hundreds — chunk to 200 just in case).
  const CHUNK = 200;
  const items: SnapshotItem[] = [];
  for (let i = 0; i < docIds.length; i += CHUNK) {
    const chunk = docIds.slice(i, i + CHUNK);
    const refs = chunk.map((id) => db.collection(collection).doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      items.push({
        docId: chunk[idx],
        existed: snap.exists,
        data: snap.exists ? snap.data() ?? null : null,
      });
    });
  }

  // Write to Firestore subcollection via BulkWriter (handles retries + throttling)
  const bulk = db.bulkWriter();
  const itemsRef = db.collection(META_COLLECTION).doc(importId).collection(ITEMS_SUBCOLLECTION);
  for (const item of items) {
    bulk.set(itemsRef.doc(item.docId), item);
  }
  await bulk.close();

  // Write JSON dump to Storage
  const storagePath = `${STORAGE_PREFIX}/${importId}.json`;
  const bucket = getAdminStorage().bucket();
  await bucket.file(storagePath).save(JSON.stringify({ importId, collection, items }, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-store' },
  });

  // Update metadata with counts + storage path
  await db.collection(META_COLLECTION).doc(importId).update({
    itemCount: items.length,
    storageBackupPath: storagePath,
  });
}

/** Mark an import as committed (optional; purely informational). */
export async function markCommitted(importId: string): Promise<void> {
  await getAdminDb().collection(META_COLLECTION).doc(importId).update({ status: 'committed' });
}

/**
 * Restore every snapshot associated with importId back into its original
 * collection. Docs that were existed=false are deleted. Returns count.
 */
export async function restoreImport(importId: string): Promise<{ restored: number }> {
  const db = getAdminDb();
  const metaSnap = await db.collection(META_COLLECTION).doc(importId).get();
  if (!metaSnap.exists) throw new Error(`Import ${importId} not found`);
  const meta = metaSnap.data() as ImportMeta;

  const itemsSnap = await db.collection(META_COLLECTION).doc(importId).collection(ITEMS_SUBCOLLECTION).get();
  const bulk = db.bulkWriter();
  let restored = 0;
  for (const itemDoc of itemsSnap.docs) {
    const item = itemDoc.data() as SnapshotItem;
    const targetRef = db.collection(meta.collection).doc(item.docId);
    if (item.existed && item.data) {
      bulk.set(targetRef, item.data);
    } else {
      bulk.delete(targetRef);
    }
    restored++;
  }
  await bulk.close();

  await db.collection(META_COLLECTION).doc(importId).update({
    status: 'restored',
    restoredAt: FieldValue.serverTimestamp(),
  });
  return { restored };
}

/** Return the most recent imports, newest first. */
export async function listRecentImports(limit = 10): Promise<ImportMeta[]> {
  const snap = await getAdminDb()
    .collection(META_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as ImportMeta);
}

/** Delete all but the `keep` most-recent imports (Firestore + Storage). */
export async function pruneOldImports(keep = 10): Promise<{ pruned: number }> {
  const db = getAdminDb();
  const all = await db.collection(META_COLLECTION).orderBy('createdAt', 'desc').get();
  if (all.size <= keep) return { pruned: 0 };

  const toPrune = all.docs.slice(keep);
  const bucket = getAdminStorage().bucket();
  let pruned = 0;

  for (const metaDoc of toPrune) {
    const meta = metaDoc.data() as ImportMeta;
    // Delete items subcollection via BulkWriter
    const itemsSnap = await metaDoc.ref.collection(ITEMS_SUBCOLLECTION).get();
    const bulk = db.bulkWriter();
    itemsSnap.docs.forEach((d) => bulk.delete(d.ref));
    bulk.delete(metaDoc.ref);
    await bulk.close();
    // Delete Storage JSON dump
    if (meta.storageBackupPath) {
      await bucket.file(meta.storageBackupPath).delete({ ignoreNotFound: true });
    }
    pruned++;
  }
  return { pruned };
}

/** Read the Storage JSON dump (for admin download). */
export async function readStorageBackup(importId: string): Promise<Buffer> {
  const storagePath = `${STORAGE_PREFIX}/${importId}.json`;
  const [buf] = await getAdminStorage().bucket().file(storagePath).download();
  return buf;
}
