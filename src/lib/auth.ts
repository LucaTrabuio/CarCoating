import { getAdminAuth, getAdminDb } from './firebase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateTempPasswordNode } from './password-policy';
import { requirePiiAccessFromCookieStore } from './pii-session';

// ─── Types ───

export type UserRole = 'super_admin' | 'store_admin';

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
  managed_stores: string[];
  passwordChangedAt?: string;
  mustChangePassword?: boolean;
}

export { requirePiiAccessFromCookieStore as requirePiiAccess };

export interface UserClaims {
  role: UserRole;
  managed_stores?: string[];
}

// ─── Session verification (server-side) ───

export async function verifySession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) return null;

    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(session, true);

    const role = (decoded.role as UserRole) || 'store_admin';
    const managed_stores = (decoded.managed_stores as string[]) || [];

    // Load password policy fields from Firestore
    let passwordChangedAt: string | undefined;
    let mustChangePassword: boolean | undefined;
    try {
      const db = getAdminDb();
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data()!;
        passwordChangedAt = data.passwordChangedAt || undefined;
        mustChangePassword = data.mustChangePassword === true ? true : undefined;
      }
    } catch {
      // non-critical — proceed without policy fields
    }

    return {
      uid: decoded.uid,
      email: decoded.email || '',
      role,
      managed_stores,
      passwordChangedAt,
      mustChangePassword,
    };
  } catch {
    return null;
  }
}

// ─── Create session cookie from ID token ───

export async function createSessionCookie(idToken: string): Promise<string> {
  const auth = getAdminAuth();
  // 14-day session
  const expiresIn = 60 * 60 * 24 * 14 * 1000;
  return auth.createSessionCookie(idToken, { expiresIn });
}

// ─── API route auth check ───

/**
 * Check auth and return the session user, or return an error response.
 * Use at the top of any protected API route handler.
 */
export async function requireAuth(requiredRole?: UserRole): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await verifySession();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (requiredRole === 'super_admin' && user.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden: super_admin required' }, { status: 403 }) };
  }

  return { user };
}

// ─── Helpers ───

export function canManageStore(user: SessionUser, storeId: string): boolean {
  if (user.role === 'super_admin') return true;
  return user.managed_stores.includes(storeId);
}

export async function setUserClaims(uid: string, claims: UserClaims): Promise<void> {
  const auth = getAdminAuth();
  await auth.setCustomUserClaims(uid, claims);
}

export async function createUser(
  email: string,
  displayName: string,
  role: UserRole,
  managedStores: string[] = [],
): Promise<{ uid: string; tempPassword: string }> {
  const tempPassword = generateTempPasswordNode();
  const auth = getAdminAuth();
  const user = await auth.createUser({
    email,
    password: tempPassword,
    displayName,
  });
  await auth.setCustomUserClaims(user.uid, {
    role,
    managed_stores: managedStores,
  });

  const now = new Date().toISOString();
  const db = getAdminDb();
  await db.collection('users').doc(user.uid).set({
    email,
    display_name: displayName,
    role,
    managed_stores: managedStores,
    created_at: now,
    passwordChangedAt: now,
    mustChangePassword: true,
  });

  return { uid: user.uid, tempPassword };
}

export async function resetUserPassword(targetUid: string, byUid: string): Promise<{ tempPassword: string }> {
  const tempPassword = generateTempPasswordNode();
  const auth = getAdminAuth();
  await auth.updateUser(targetUid, { password: tempPassword });

  const now = new Date().toISOString();
  const db = getAdminDb();

  // Invalidate any pending reset tokens for this user
  const tokensSnap = await db
    .collection('passwordResetTokens')
    .where('adminUid', '==', targetUid)
    .where('usedAt', '==', null)
    .get();
  const batch = db.batch();
  tokensSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { usedAt: now });
  });

  // Update user doc
  batch.update(db.collection('users').doc(targetUid), {
    mustChangePassword: true,
    sessionInvalidAfter: now,
    passwordChangedAt: now,
  });

  await batch.commit();

  return { tempPassword };
}
