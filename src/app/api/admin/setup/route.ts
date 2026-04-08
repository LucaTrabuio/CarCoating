import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// One-time setup endpoint to create the initial super admin user.
// This route is protected by a setup key to prevent unauthorized access.
// After creating the admin, disable this route by removing the ADMIN_SETUP_KEY env var.
//
// Usage: POST /api/admin/setup
// Body: { setupKey: "your-setup-key", email: "admin@example.com", password: "your-password", displayName: "Admin" }

export async function POST(req: Request) {
  const { setupKey, email, password, displayName } = await req.json();

  // Check setup key (set ADMIN_SETUP_KEY in .env.local)
  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'Setup disabled. Set ADMIN_SETUP_KEY in .env.local to enable.' },
      { status: 403 }
    );
  }

  if (setupKey !== expectedKey) {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();

    // Check if any users exist already
    const existing = await auth.listUsers(1);
    const isFirstUser = existing.users.length === 0;

    // Create the user
    const user = await auth.createUser({
      email,
      password,
      displayName: displayName || 'Super Admin',
    });

    // Set super_admin claims
    await auth.setCustomUserClaims(user.uid, {
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
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      email,
      message: isFirstUser
        ? 'First super admin created! You can now log in at /login. Remove ADMIN_SETUP_KEY from .env.local to disable this endpoint.'
        : 'Super admin created. Remove ADMIN_SETUP_KEY from .env.local to disable this endpoint.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
