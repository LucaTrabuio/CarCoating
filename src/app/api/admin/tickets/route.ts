import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TicketMessage {
  uid: string;
  email: string;
  text: string;
  createdAt: string;
}

// GET: List tickets (store_admin sees own, super_admin sees all)
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const db = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection('tickets');

    // store_admin can only see tickets they created
    if (user.role === 'store_admin') {
      query = query.where('authorUid', '==', user.uid);
    }

    const snap = await query.get();
    const tickets = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create ticket or add message
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { action } = body;

    const db = getAdminDb();

    if (action === 'create') {
      const { subject, text, storeId } = body;
      if (!subject?.trim() || !text?.trim()) {
        return NextResponse.json({ error: 'subject and text are required' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const ticket = {
        storeId: storeId || '',
        authorUid: user.uid,
        authorEmail: user.email,
        subject: subject.trim(),
        status: 'open',
        messages: [{
          uid: user.uid,
          email: user.email,
          text: text.trim(),
          createdAt: now,
        }],
        createdAt: now,
        updatedAt: now,
      };

      const ref = await db.collection('tickets').add(ticket);
      return NextResponse.json({ id: ref.id }, { status: 201 });
    }

    if (action === 'reply') {
      const { ticketId, text } = body;
      if (!ticketId || !text?.trim()) {
        return NextResponse.json({ error: 'ticketId and text are required' }, { status: 400 });
      }

      const ref = db.collection('tickets').doc(ticketId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // store_admin can only reply to own tickets
      if (user.role === 'store_admin' && doc.data()?.authorUid !== user.uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const message: TicketMessage = {
        uid: user.uid,
        email: user.email,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      await ref.update({
        messages: FieldValue.arrayUnion(message),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'status') {
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { ticketId, status } = body;
      if (!ticketId || !['open', 'in_progress', 'closed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid ticketId or status' }, { status: 400 });
      }
      await db.collection('tickets').doc(ticketId).update({
        status,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'edit') {
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { ticketId, subject } = body;
      if (!ticketId || !subject?.trim()) {
        return NextResponse.json({ error: 'ticketId and subject are required' }, { status: 400 });
      }
      await db.collection('tickets').doc(ticketId).update({
        subject: subject.trim(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { ticketId } = body;
      if (!ticketId) {
        return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
      }
      await db.collection('tickets').doc(ticketId).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete_message') {
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { ticketId, messageIndex } = body;
      if (!ticketId || typeof messageIndex !== 'number') {
        return NextResponse.json({ error: 'ticketId and messageIndex are required' }, { status: 400 });
      }
      const ref = db.collection('tickets').doc(ticketId);
      const doc = await ref.get();
      if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const messages = (doc.data()?.messages || []) as unknown[];
      if (messageIndex < 0 || messageIndex >= messages.length) {
        return NextResponse.json({ error: 'Invalid messageIndex' }, { status: 400 });
      }
      messages.splice(messageIndex, 1);
      await ref.update({ messages, updatedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
