import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, createUser, type UserRole } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTempPasswordEmail } from '@/lib/admin-security-emails';
import { createAdminUserSchema } from '@/lib/validations';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { email, displayName, role, managedStores } = parsed.data;

  try {
    const { uid, tempPassword } = await createUser(
      email,
      displayName,
      role as UserRole,
      managedStores,
    );

    // Send temp password email (best-effort)
    try {
      await sendTempPasswordEmail({
        adminEmail: email,
        adminName: displayName,
        tempPassword,
      });
    } catch (emailErr) {
      console.error('Failed to send temp password email:', emailErr);
    }

    return NextResponse.json({ success: true, uid });
  } catch (error) {
    console.error('Create user failed:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
