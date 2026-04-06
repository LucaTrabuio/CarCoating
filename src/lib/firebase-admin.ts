import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

let _adminDb: Firestore | null = null;

function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase not configured: FIREBASE_PROJECT_ID is missing. Set Firebase env vars to use V3 features.');
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: getPrivateKey(),
  };

  const app =
    getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];

  _adminDb = getFirestore(app);
  return _adminDb;
}

export { getAdminDb };
