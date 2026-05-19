import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// GET: List users filtered by the requester's role.
// super_admin sees all users; store_admin sees only non-super_admin users
// whose managed_stores overlap with theirs.
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const db = getAdminDb();
    const snap = await db.collection('users').get();
    const all = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    if (auth.user.role === 'super_admin') {
      return NextResponse.json({ users: all });
    }

    // store_admin: hide super_admins, filter to overlapping managed_stores
    const myStores = new Set(auth.user.managed_stores);
    const filtered = all.filter((u) => {
      const role = (u as { role?: string }).role;
      if (role === 'super_admin') return false;
      const theirStores: string[] = (u as { managed_stores?: string[] }).managed_stores ?? [];
      return theirStores.some((s) => myStores.has(s));
    });

    return NextResponse.json({ users: filtered });
  } catch (error) {
    console.error('[admin/users] list failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
