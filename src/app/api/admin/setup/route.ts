import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/auth';

// Create a new super admin user. Only callable by an existing super admin.
//
// Usage: POST /api/admin/setup
// Body: { email: "admin@example.com", password: "your-password", displayName: "Admin" }

export async function POST(req: Request) {
  const auth = await requireAuth('super_admin');
  if (auth.error) return auth.error;

  const { email, password, displayName } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();

    // Create the user
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || 'Super Admin',
    });

    // Set super_admin claims
    await adminAuth.setCustomUserClaims(user.uid, {
      role: 'super_admin',
      managed_stores: [],
    });

    // Save to Firestore
    const db = getAdminDb();
    await db.collection('users').doc(user.uid).set({
      email,
      display_name: displayName || 'Super Admin',
      role: 'super_admin',
      managed_stores: [],
      created_at: new Date().toISOString(),
      created_by: auth.user.uid,
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      email,
      message: 'Super admin created.',
    });
  } catch (error) {
    console.error('Admin setup failed:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
