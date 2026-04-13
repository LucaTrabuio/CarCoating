/**
 * Reusable ticket API handler logic.
 * Decoupled from Next.js — works with any framework that provides
 * a Firestore instance and user context.
 *
 * Usage in Next.js route handler:
 *   import { handleTicketAction } from '@/modules/support-tickets/api/tickets-handler';
 *   const result = await handleTicketAction(db, user, body);
 *   return NextResponse.json(result.data, { status: result.status });
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { TicketMessage } from '../types';

interface User {
  uid: string;
  email: string;
  role: string;
}

interface ActionResult {
  status: number;
  data: Record<string, unknown>;
}

/**
 * List tickets. Super admin sees all, others see only their own.
 */
export async function listTickets(db: Firestore, user: User): Promise<ActionResult> {
  let query: FirebaseFirestore.Query = db.collection('tickets');
  if (user.role !== 'super_admin') {
    query = query.where('authorUid', '==', user.uid);
  }
  const snap = await query.get();
  const tickets = snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        key: data.key || d.id.slice(0, 8),
        type: data.type || 'general',
        severity: data.severity || 'medium',
        assigneeEmail: data.assigneeEmail || '',
        resolvedAt: data.resolvedAt || null,
        closedAt: data.closedAt || null,
        ...data,
      };
    })
    .sort((a, b) => String((b as Record<string, unknown>).updatedAt || '').localeCompare(String((a as Record<string, unknown>).updatedAt || '')));
  return { status: 200, data: { tickets } };
}

/**
 * Handle a ticket action (create, reply, status, edit, delete, delete_message).
 */
export async function handleTicketAction(
  db: Firestore,
  user: User,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  const { action } = body;

  if (action === 'create') {
    const { subject, text, storeId, type, severity } = body as Record<string, string>;
    if (!subject?.trim() || !text?.trim()) {
      return { status: 400, data: { error: 'subject and text are required' } };
    }
    const countSnap = await db.collection('tickets').count().get();
    const nextNum = (countSnap.data().count || 0) + 1;
    const key = `TKT-${String(nextNum).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const ticket = {
      key,
      type: type || 'general',
      severity: severity || 'medium',
      storeId: storeId || '',
      authorUid: user.uid,
      authorEmail: user.email,
      subject: subject.trim(),
      status: 'open',
      messages: [{ uid: user.uid, email: user.email, text: text.trim(), createdAt: now }],
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection('tickets').add(ticket);
    return { status: 201, data: { id: ref.id, key } };
  }

  if (action === 'reply') {
    const { ticketId, text } = body as Record<string, string>;
    if (!ticketId || !text?.trim()) {
      return { status: 400, data: { error: 'ticketId and text are required' } };
    }
    const ref = db.collection('tickets').doc(ticketId);
    const doc = await ref.get();
    if (!doc.exists) return { status: 404, data: { error: 'Ticket not found' } };
    if (user.role !== 'super_admin' && doc.data()?.authorUid !== user.uid) {
      return { status: 403, data: { error: 'Forbidden' } };
    }
    const message: TicketMessage = { uid: user.uid, email: user.email, text: text.trim(), createdAt: new Date().toISOString() };
    const update: Record<string, unknown> = {
      messages: FieldValue.arrayUnion(message),
      updatedAt: new Date().toISOString(),
    };
    if (!doc.data()?.assigneeEmail) update.assigneeEmail = user.email;
    await ref.update(update);
    return { status: 200, data: { ok: true } };
  }

  if (action === 'status') {
    if (user.role !== 'super_admin') return { status: 403, data: { error: 'Forbidden' } };
    const { ticketId, status } = body as Record<string, string>;
    if (!ticketId || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return { status: 400, data: { error: 'Invalid ticketId or status' } };
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status, updatedAt: now };
    if (status === 'resolved') update.resolvedAt = now;
    if (status === 'closed') update.closedAt = now;
    const ticketDoc = await db.collection('tickets').doc(ticketId).get();
    if (!ticketDoc.data()?.assigneeEmail) update.assigneeEmail = user.email;
    await db.collection('tickets').doc(ticketId).update(update);
    return { status: 200, data: { ok: true } };
  }

  if (action === 'edit') {
    if (user.role !== 'super_admin') return { status: 403, data: { error: 'Forbidden' } };
    const { ticketId, subject } = body as Record<string, string>;
    if (!ticketId || !subject?.trim()) return { status: 400, data: { error: 'ticketId and subject required' } };
    await db.collection('tickets').doc(ticketId).update({ subject: subject.trim(), updatedAt: new Date().toISOString() });
    return { status: 200, data: { ok: true } };
  }

  if (action === 'delete') {
    if (user.role !== 'super_admin') return { status: 403, data: { error: 'Forbidden' } };
    const { ticketId } = body as Record<string, string>;
    if (!ticketId) return { status: 400, data: { error: 'ticketId required' } };
    await db.collection('tickets').doc(ticketId).delete();
    return { status: 200, data: { ok: true } };
  }

  if (action === 'delete_message') {
    if (user.role !== 'super_admin') return { status: 403, data: { error: 'Forbidden' } };
    const { ticketId, messageIndex } = body as Record<string, unknown>;
    if (!ticketId || typeof messageIndex !== 'number') return { status: 400, data: { error: 'ticketId and messageIndex required' } };
    const ref = db.collection('tickets').doc(ticketId as string);
    const doc = await ref.get();
    if (!doc.exists) return { status: 404, data: { error: 'Not found' } };
    const messages = (doc.data()?.messages || []) as unknown[];
    if (messageIndex < 0 || messageIndex >= messages.length) return { status: 400, data: { error: 'Invalid index' } };
    messages.splice(messageIndex, 1);
    await ref.update({ messages, updatedAt: new Date().toISOString() });
    return { status: 200, data: { ok: true } };
  }

  return { status: 400, data: { error: 'Invalid action' } };
}
