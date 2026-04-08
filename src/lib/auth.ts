import { getAdminAuth, getAdminDb } from './firebase-admin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ─── Types ───

export type UserRole = 'super_admin' | 'store_admin';

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
  managed_stores: string[];
}

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

    return {
      uid: decoded.uid,
      email: decoded.email || '',
      role,
      managed_stores,
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
  password: string,
  displayName: string,
  role: UserRole,
  managedStores: string[] = [],
): Promise<string> {
  const auth = getAdminAuth();
  const user = await auth.createUser({
    email,
    password,
    displayName,
  });
  await auth.setCustomUserClaims(user.uid, {
    role,
    managed_stores: managedStores,
  });

  // Also store in Firestore users collection
  const db = getAdminDb();
  await db.collection('users').doc(user.uid).set({
    email,
    display_name: displayName,
    role,
    managed_stores: managedStores,
    created_at: new Date().toISOString(),
  });

  return user.uid;
}
