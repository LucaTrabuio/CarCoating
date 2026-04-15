import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, setUserClaims, type UserRole } from '@/lib/auth';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// PUT: Update user role and managed stores (super_admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { uid } = await params;
  const { role, managedStores, displayName } = await req.json();

  if (role && !['super_admin', 'store_admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    // Update custom claims
    if (role) {
      await setUserClaims(uid, {
        role: role as UserRole,
        managed_stores: managedStores,
      });
    }

    // Update display name if provided
    if (displayName) {
      const auth = getAdminAuth();
      await auth.updateUser(uid, { displayName });
    }

    // Update Firestore user doc
    const db = getAdminDb();
    const update: Record<string, unknown> = {};
    if (role) update.role = role;
    if (managedStores) update.managed_stores = managedStores;
    if (displayName) update.display_name = displayName;
    if (Object.keys(update).length > 0) {
      await db.collection('users').doc(uid).set(update, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User management error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

// DELETE: Disable user (super_admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { uid } = await params;

  try {
    const auth = getAdminAuth();
    await auth.updateUser(uid, { disabled: true });

    const db = getAdminDb();
    await db.collection('users').doc(uid).set({ disabled: true }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User management error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
