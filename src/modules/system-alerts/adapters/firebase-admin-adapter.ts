// Default Firestore-backed AlertStorageAdapter using firebase-admin.
//
// SERVER ONLY — this file imports firebase-admin and must never be loaded
// from client bundles. The module's `index.ts` deliberately does NOT
// re-export this; consumers import it explicitly from a server-only entry
// point (an API route, a cron handler, etc.).
//
// Usage:
//   import { getFirestore } from "firebase-admin/firestore";
//   import { createFirebaseAdminAdapter } from "@/modules/system-alerts/adapters/firebase-admin-adapter";
//
//   const adapter = createFirebaseAdminAdapter({
//     adminDb: getFirestore(),
//     collection: "systemAlerts",        // optional — defaults shown
//     // maxFetchMultiplier: 4,          // see listAlerts() note below
//     // maxFetchCeiling: 500,
//   });

import type { Firestore, Query } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import type {
  AlertSource,
  AlertStorageAdapter,
  ListAlertsQuery,
  StatusPatch,
  SystemAlert,
} from "../types";

export interface FirebaseAdminAdapterConfig {
  adminDb: Firestore;
  /** Firestore collection name. Default: "systemAlerts". */
  collection?: string;
  /** When listing with severity/status/source filters, we over-fetch by this
   *  multiplier and then filter in memory — sidesteps the composite-index
   *  requirement for `where(...) + orderBy(createdAt)`. Default: 4. */
  maxFetchMultiplier?: number;
  /** Hard cap on the over-fetch size. Default: 500. */
  maxFetchCeiling?: number;
}

export function createFirebaseAdminAdapter(
  config: FirebaseAdminAdapterConfig,
): AlertStorageAdapter {
  const {
    adminDb,
    collection = "systemAlerts",
    maxFetchMultiplier = 4,
    maxFetchCeiling = 500,
  } = config;

  const col = () => adminDb.collection(collection);

  function toIso(val: unknown): string {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object" && val && "toDate" in val) {
      return (val as { toDate(): Date }).toDate().toISOString();
    }
    return String(val);
  }

  function docToAlert(id: string, data: FirebaseFirestore.DocumentData): SystemAlert {
    return {
      id,
      source: data.source ?? "other",
      severity: data.severity ?? "info",
      status: data.status ?? "open",
      title: data.title ?? "",
      payload: data.payload,
      dedupeKey: data.dedupeKey,
      occurrences: data.occurrences ?? 1,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      notifiedAt: data.notifiedAt ? toIso(data.notifiedAt) : undefined,
      acknowledgedAt: data.acknowledgedAt ? toIso(data.acknowledgedAt) : undefined,
      acknowledgedBy: data.acknowledgedBy,
      resolvedAt: data.resolvedAt ? toIso(data.resolvedAt) : undefined,
      resolvedBy: data.resolvedBy,
    };
  }

  return {
    async findOpenByDedupeKey(dedupeKey: string): Promise<SystemAlert | null> {
      // The Firebase adapter uses dedupeKey-as-doc-id, so this is a single
      // doc lookup — no query / no composite index.
      const ref = col().doc(dedupeKey);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      if (data.status !== "open") return null;
      return docToAlert(snap.id, data);
    },

    async bumpAlert(id, { stampNotifiedAt }) {
      const ref = col().doc(id);
      const patch: Record<string, unknown> = {
        occurrences: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (stampNotifiedAt) patch.notifiedAt = FieldValue.serverTimestamp();
      await ref.update(patch);
      const fresh = await ref.get();
      return docToAlert(fresh.id, fresh.data()!);
    },

    async createAlert(id, data) {
      const ref = id ? col().doc(id) : col().doc();
      const writeData: Record<string, unknown> = {
        source: data.source,
        severity: data.severity,
        status: data.status,
        title: data.title,
        payload: data.payload ?? null,
        dedupeKey: data.dedupeKey ?? null,
        occurrences: data.occurrences ?? 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (data.notifiedAt) writeData.notifiedAt = FieldValue.serverTimestamp();
      // When using dedupeKey-as-id: an old resolved/acknowledged doc at the
      // same id is *overwritten* back to "open". That's the intended
      // "alert re-fires" semantics; document this in your consumer if it
      // matters for audit trail.
      await ref.set(writeData, { merge: false });
      const fresh = await ref.get();
      return docToAlert(fresh.id, fresh.data()!);
    },

    async listAlerts(query: ListAlertsQuery): Promise<SystemAlert[]> {
      const limit = query.limit ?? 100;

      // Compose ONLY filters that don't require a composite index.
      let q: Query = col();
      if (query.since) {
        // createdAt range + orderBy(createdAt) uses the auto-created
        // single-field index.
        q = q.where("createdAt", ">=", query.since);
      }
      q = q
        .orderBy("createdAt", "desc")
        .limit(Math.min(limit * maxFetchMultiplier, maxFetchCeiling));

      const snap = await q.get();
      let alerts = snap.docs.map((d) => docToAlert(d.id, d.data()));

      // In-memory filtering for the rest. Low alert volume makes this fine;
      // if a consumer ever needs scale, deploy a composite index and
      // override this adapter.
      if (query.severity?.length) {
        alerts = alerts.filter((a) => query.severity!.includes(a.severity));
      }
      if (query.status?.length) {
        alerts = alerts.filter((a) => query.status!.includes(a.status));
      }
      if (query.sources?.length) {
        alerts = alerts.filter((a) => query.sources!.includes(a.source));
      }
      if (query.excludeSources?.length) {
        alerts = alerts.filter((a) => !query.excludeSources!.includes(a.source));
      }
      return alerts.slice(0, limit);
    },

    async getAlertById(id: string): Promise<SystemAlert | null> {
      const snap = await col().doc(id).get();
      if (!snap.exists) return null;
      return docToAlert(snap.id, snap.data()!);
    },

    async updateAlertStatus(id: string, patch: StatusPatch): Promise<void> {
      const update: Record<string, unknown> = {
        status: patch.status,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (patch.status === "acknowledged") {
        update.acknowledgedAt = FieldValue.serverTimestamp();
        update.acknowledgedBy = patch.by;
      } else {
        update.resolvedAt = FieldValue.serverTimestamp();
        update.resolvedBy = patch.by;
      }
      await col().doc(id).update(update);
    },

    async purgeBySource(source: AlertSource): Promise<number> {
      const snap = await col().where("source", "==", source).get();
      if (snap.empty) return 0;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return snap.size;
    },
  };
}
