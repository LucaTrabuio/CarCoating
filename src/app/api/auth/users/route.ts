import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, createUser, type UserRole } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

// GET: List all users (super_admin only)
export async function GET() {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const db = getAdminDb();
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

  return NextResponse.json(users);
}

// POST: Create a new user (super_admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { email, password, displayName, role, managedStores } = await req.json();

  if (!email || !password || !displayName || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['super_admin', 'store_admin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const uid = await createUser(
      email,
      password,
      displayName,
      role as UserRole,
      managedStores || [],
    );
    return NextResponse.json({ success: true, uid });
  } catch (error) {
    console.error('Create user failed:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
