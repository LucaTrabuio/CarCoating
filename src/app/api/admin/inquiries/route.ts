import { NextResponse } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendInquiryReplyEmail } from '@/lib/email';
import { getV3StoreById } from '@/lib/firebase-stores';
import { FieldValue } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';

// GET: List inquiries (store_admin sees own stores, super_admin sees all)
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const db = getAdminDb();
    let inquiries: Array<{ id: string; [key: string]: unknown }> = [];

    if (user.role === 'super_admin') {
      const snap = await db.collection('inquiries').orderBy('createdAt', 'desc').get();
      inquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      const stores = user.managed_stores || [];
      if (stores.length === 0) return NextResponse.json({ inquiries: [] });
      for (let i = 0; i < stores.length; i += 30) {
        const chunk = stores.slice(i, i + 30);
        const snap = await db.collection('inquiries').where('storeId', 'in', chunk).get();
        snap.docs.forEach(d => inquiries.push({ id: d.id, ...d.data() }));
      }
      inquiries.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update inquiry status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { inquiryId, status, replyText } = await req.json();
    if (!inquiryId || !['open', 'replied', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid inquiryId or status' }, { status: 400 });
    }

    const db = getAdminDb();
    const doc = await db.collection('inquiries').doc(inquiryId).get();
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const storeId = doc.data()?.storeId;
    if (!canManageStore(user, storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // If action is 'reply', also send email and store the reply
    if (status === 'replied' && replyText?.trim()) {
      const inquiry = doc.data()!;
      const store = await getV3StoreById(storeId);

      updateData.replies = FieldValue.arrayUnion({
        email: user.email,
        text: replyText.trim(),
        createdAt: new Date().toISOString(),
      });

      try {
        await sendInquiryReplyEmail({
          customerEmail: inquiry.customerEmail,
          customerName: inquiry.customerName,
          locationName: store?.store_name || storeId,
          replyText: replyText.trim(),
          originalMessage: inquiry.message || '',
        });
      } catch (emailErr) {
        console.error('Inquiry reply email failed:', emailErr);
      }
    }

    await db.collection('inquiries').doc(inquiryId).update(updateData);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
