import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendTicketNotificationEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

// Called from the CustomHtml block editor when a store admin requests advanced customization.
// Creates a support ticket and emails super admins.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { htmlLength, cssLength } = await req.json().catch(() => ({ htmlLength: 0, cssLength: 0 }));

  const db = getAdminDb();
  const now = new Date().toISOString();
  const key = `HTML-${nanoid(6).toUpperCase()}`;
  const subject = 'カスタムHTML 高度なカスタマイズ依頼';
  const message = `店舗管理者がカスタムHTMLブロックでの高度なカスタマイズを希望しています。\n\n` +
    `依頼者: ${user.email}\n` +
    `現在のHTML長さ: ${Number(htmlLength) || 0} 文字\n` +
    `現在のCSS長さ: ${Number(cssLength) || 0} 文字\n\n` +
    `サニタイズで削除される機能（スクリプト、iframe等）が必要な場合、別途対応します。`;

  const ticket = {
    key,
    type: 'support',
    severity: 'medium',
    storeId: user.managed_stores[0] || '',
    authorUid: user.uid,
    authorEmail: user.email,
    subject,
    status: 'open',
    messages: [{ uid: user.uid, email: user.email, text: message, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('tickets').add(ticket);

  try {
    const usersSnap = await db.collection('users').where('role', '==', 'super_admin').get();
    const adminEmails = usersSnap.docs.map((d) => d.data().email).filter(Boolean) as string[];
    if (adminEmails.length > 0) {
      await sendTicketNotificationEmail({
        adminEmails,
        authorEmail: user.email,
        key,
        subject,
        type: 'support',
        severity: 'medium',
        message,
      });
    }
  } catch (err) {
    console.error('Custom-HTML notice email failed:', err);
  }

  return NextResponse.json({ success: true, key });
}
