import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, canManageStore } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  visible: boolean;
}

function parseStoreNews(raw: unknown): NewsItem[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    return JSON.parse(raw) as NewsItem[];
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminDb();
  const doc = await db.collection('stores').doc(storeId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  const items = parseStoreNews(doc.data()?.store_news);
  return NextResponse.json({ items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, date, visible } = body as Omit<NewsItem, 'id'>;

  const db = getAdminDb();
  const docRef = db.collection('stores').doc(storeId);
  const doc = await docRef.get();

  const items = parseStoreNews(doc.data()?.store_news);
  const newItem: NewsItem = {
    id: String(Date.now()),
    title,
    content,
    date,
    visible: visible ?? true,
  };
  items.push(newItem);

  await docRef.set({ store_news: JSON.stringify(items) }, { merge: true });
  return NextResponse.json({ item: newItem }, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, title, content, date, visible } = body as NewsItem;

  const db = getAdminDb();
  const docRef = db.collection('stores').doc(storeId);
  const doc = await docRef.get();

  const items = parseStoreNews(doc.data()?.store_news);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'News item not found' }, { status: 404 });
  }

  items[idx] = { id, title, content, date, visible };
  await docRef.set({ store_news: JSON.stringify(items) }, { merge: true });
  return NextResponse.json({ item: items[idx] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const user = auth.user;

  const { storeId } = await params;
  if (!canManageStore(user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body as { id: string };

  const db = getAdminDb();
  const docRef = db.collection('stores').doc(storeId);
  const doc = await docRef.get();

  const items = parseStoreNews(doc.data()?.store_news);
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) {
    return NextResponse.json({ error: 'News item not found' }, { status: 404 });
  }

  await docRef.set({ store_news: JSON.stringify(filtered) }, { merge: true });
  return NextResponse.json({ success: true });
}
