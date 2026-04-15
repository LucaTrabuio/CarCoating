import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth as _getAuth, type Auth } from "firebase-admin/auth";

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

let _adminDb: Firestore | null = null;

function ensureApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase not configured: FIREBASE_PROJECT_ID is missing. Set Firebase env vars to use V3 features.');
  }

  if (getApps().length > 0) return getApps()[0];

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: getPrivateKey(),
  };

  return initializeApp({ credential: cert(serviceAccount) });
}

function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;
  const app = ensureApp();
  _adminDb = getFirestore(app);
  return _adminDb;
}

function getAdminAuth(): Auth {
  const app = ensureApp();
  return _getAuth(app);
}

export { getAdminDb, getAdminAuth };
