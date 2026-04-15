import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { requireAuth } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import nextPkg from 'next/package.json';

type CheckStatus = 'ok' | 'warn' | 'error' | 'info';

interface CheckItem {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
}

interface Check {
  label: string;
  status: CheckStatus;
  value?: string;
  detail?: string;
  items?: CheckItem[];
}

interface Section {
  title: string;
  checks: Check[];
}

function envStatus(name: string, required = true): Check {
  const value = process.env[name];
  if (!value) {
    return { label: name, status: required ? 'error' : 'warn', value: '(not set)' };
  }
  const secretPatterns = [/KEY/, /SECRET/, /PASSWORD/, /TOKEN/, /CREDENTIAL/];
  const isSecret = secretPatterns.some(p => p.test(name));
  const display = isSecret ? 'set' : value;
  return { label: name, status: 'ok', value: display };
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET() {
  try {
    const auth = await requireAuth('super_admin');
    if (auth.error) return auth.error;

    const sections: Section[] = [];

    // ─── Environment ───
    sections.push({
      title: '環境',
      checks: [
        { label: 'Node version', status: 'info', value: process.version },
        { label: 'Next.js version', status: 'info', value: nextPkg.version },
        { label: 'NODE_ENV', status: 'info', value: process.env.NODE_ENV || '(unset)' },
        envStatus('NEXT_PUBLIC_SITE_URL', false),
        envStatus('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
      ],
    });

    // ─── Firebase Admin ───
    const firebaseChecks: Check[] = [
      envStatus('FIREBASE_PROJECT_ID'),
      envStatus('FIREBASE_CLIENT_EMAIL'),
      envStatus('FIREBASE_PRIVATE_KEY'),
    ];

    let db: ReturnType<typeof getAdminDb> | null = null;
    try {
      db = getAdminDb();
      await db.collection('stores').limit(1).get();
      firebaseChecks.push({ label: 'Firestore 接続', status: 'ok', value: 'connected' });
    } catch (e) {
      firebaseChecks.push({
        label: 'Firestore 接続',
        status: 'error',
        value: 'failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
    sections.push({ title: 'Firebase', checks: firebaseChecks });

    if (!db) {
      return NextResponse.json({ sections, generatedAt: new Date().toISOString() });
    }

    // Load all stores once (used across several checks)
    const storesSnap = await db.collection('stores').get();
    const storeMap = new Map<string, { name: string; data: FirebaseFirestore.DocumentData }>();
    storesSnap.docs.forEach(d => {
      storeMap.set(d.id, { name: d.data().store_name || d.id, data: d.data() });
    });

    // Load sub-companies for URL lookup
    const subCompanyUrlByStoreId = new Map<string, string>();
    try {
      const subSnap = await db.collection('sub_companies').get();
      const subUrlById = new Map<string, string>();
      subSnap.docs.forEach(d => {
        const url = d.data().url || '';
        if (url) subUrlById.set(d.id, url);
      });
      storesSnap.docs.forEach(d => {
        const subId = d.data().sub_company_id;
        if (subId && subUrlById.has(subId)) {
          subCompanyUrlByStoreId.set(d.id, subUrlById.get(subId)!);
        }
      });
    } catch { /* sub_companies collection optional */ }

    const storeItem = (d: FirebaseFirestore.QueryDocumentSnapshot): CheckItem => ({
      id: d.id,
      label: d.data().store_name || d.id,
      sublabel: d.id,
      href: subCompanyUrlByStoreId.get(d.id),
    });

    // ─── Collections ───
    const collectionChecks: Check[] = [];

    collectionChecks.push({ label: '店舗 (stores)', status: 'info', value: String(storesSnap.size) });

    const inactiveStores = storesSnap.docs.filter(d => {
      const v = d.data().is_active;
      return !(v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1');
    });
    collectionChecks.push({
      label: 'アクティブ店舗',
      status: inactiveStores.length === 0 ? 'ok' : 'warn',
      value: `${storesSnap.size - inactiveStores.length} / ${storesSnap.size}`,
      items: inactiveStores.length > 0 ? inactiveStores.map(storeItem) : undefined,
    });

    // Grouped required-field validation
    const requiredFields = [
      { key: 'tel', label: 'TEL' },
      { key: 'address', label: '住所' },
      { key: 'prefecture', label: '都道府県' },
      { key: 'city', label: '市区町村' },
      { key: 'postal_code', label: '郵便番号' },
      { key: 'business_hours', label: '営業時間' },
      { key: 'level1_staff_count', label: 'L1スタッフ数' },
      { key: 'level2_staff_count', label: 'L2スタッフ数' },
    ];
    const storesWithMissing: { doc: FirebaseFirestore.QueryDocumentSnapshot; missing: string[] }[] = [];
    for (const doc of storesSnap.docs) {
      const data = doc.data();
      const missing: string[] = [];
      for (const f of requiredFields) {
        const val = data[f.key];
        if (f.key === 'level1_staff_count' || f.key === 'level2_staff_count') {
          if (!val || Number(val) <= 0) missing.push(f.label);
        } else {
          if (!val || (typeof val === 'string' && !val.trim())) missing.push(f.label);
        }
      }
      if (missing.length > 0) storesWithMissing.push({ doc, missing });
    }
    if (storesWithMissing.length > 0) {
      collectionChecks.push({
        label: '店舗データ未設定項目',
        status: 'warn',
        value: `${storesWithMissing.length}店舗に未設定あり`,
        items: storesWithMissing.map(({ doc, missing }) => ({
          id: doc.id,
          label: `${doc.data().store_name || doc.id}: ${missing.join(', ')}`,
          sublabel: doc.id,
        })),
      });
    }

    // page_layout stats — empty is NORMAL (the app auto-generates a default
    // layout from each store's hero_title/has_booth/etc. via parsePageLayout).
    // Only a custom page_layout stored in Firestore overrides the default.
    // So we report the custom-layout count as info, and only warn on invalid JSON.
    const customLayoutStores = storesSnap.docs.filter(d => {
      const pl = d.data().page_layout;
      return typeof pl === 'string' && pl.length > 2; // non-empty, non-"{}"
    });
    collectionChecks.push({
      label: 'カスタムレイアウト設定済み',
      status: 'info',
      value: `${customLayoutStores.length} / ${storesSnap.size}`,
      detail: 'その他の店舗は自動生成デフォルトレイアウトを使用',
    });

    const invalidLayoutStores = customLayoutStores.filter(d => {
      try {
        JSON.parse(d.data().page_layout as string);
        return false;
      } catch {
        return true;
      }
    });
    if (invalidLayoutStores.length > 0) {
      collectionChecks.push({
        label: '不正なレイアウトJSON',
        status: 'error',
        value: String(invalidLayoutStores.length),
        items: invalidLayoutStores.map(storeItem),
      });
    }

    // Stores whose sub-company has no source URL (can't reach the original website)
    const noSourceUrlStores = storesSnap.docs.filter(d => !subCompanyUrlByStoreId.has(d.id));
    if (noSourceUrlStores.length > 0) {
      collectionChecks.push({
        label: 'ソースURL未設定 (sub_company.url)',
        status: 'warn',
        value: String(noSourceUrlStores.length),
        items: noSourceUrlStores.map(storeItem),
      });
    }

    try {
      const subSnap = await db.collection('sub_companies').get();
      collectionChecks.push({ label: 'サブカンパニー (sub_companies)', status: 'info', value: String(subSnap.size) });
    } catch { /* optional */ }

    try {
      const usersSnap = await db.collection('users').get();
      const byRole = new Map<string, number>();
      usersSnap.docs.forEach(d => {
        const role = d.data().role || '(none)';
        byRole.set(role, (byRole.get(role) || 0) + 1);
      });
      collectionChecks.push({ label: 'ユーザー (users)', status: 'info', value: String(usersSnap.size) });
      for (const [role, count] of byRole) {
        collectionChecks.push({ label: `  └ ${role}`, status: 'info', value: String(count) });
      }
    } catch (e) {
      collectionChecks.push({ label: 'users 読み込み', status: 'error', value: 'failed', detail: String(e) });
    }

    try {
      const blogSnap = await db.collection('blog_posts').get();
      collectionChecks.push({ label: 'ブログ (blog_posts)', status: 'info', value: String(blogSnap.size) });
    } catch { /* optional */ }

    try {
      const campSnap = await db.collection('campaigns').get();
      collectionChecks.push({ label: 'キャンペーン (campaigns)', status: 'info', value: String(campSnap.size) });
    } catch { /* optional */ }

    sections.push({ title: 'コレクション', checks: collectionChecks });

    // ─── Reservations ───
    const reservationChecks: Check[] = [];
    try {
      const resSnap = await db.collection('reservations').get();
      const byStatus = new Map<string, number>();
      const noStoreIdItems: CheckItem[] = [];
      const noDateItems: CheckItem[] = [];
      const noStatusItems: CheckItem[] = [];
      const today = todayYmd();
      let upcoming = 0;
      const storeIdsInReservations = new Set<string>();

      for (const doc of resSnap.docs) {
        const d = doc.data();
        const status = d.status || '(none)';
        byStatus.set(status, (byStatus.get(status) || 0) + 1);
        if (!d.storeId) {
          noStoreIdItems.push({ id: doc.id, label: d.name || doc.id, sublabel: `${d.date || '?'} ${d.time || ''}`.trim() });
        } else {
          storeIdsInReservations.add(d.storeId);
        }
        if (!d.date) noDateItems.push({ id: doc.id, label: d.name || doc.id, sublabel: d.storeId || '?' });
        if (!d.status) noStatusItems.push({ id: doc.id, label: d.name || doc.id, sublabel: d.storeId || '?' });
        if (d.date >= today && (d.status === 'pending' || d.status === 'confirmed')) upcoming++;
      }

      reservationChecks.push({ label: '合計予約数', status: 'info', value: String(resSnap.size) });
      for (const [status, count] of byStatus) {
        reservationChecks.push({ label: `  └ ${status}`, status: 'info', value: String(count) });
      }
      reservationChecks.push({ label: '今後の予約', status: 'info', value: String(upcoming) });
      if (noStoreIdItems.length > 0) {
        reservationChecks.push({ label: 'storeId なし', status: 'warn', value: String(noStoreIdItems.length), items: noStoreIdItems });
      }
      if (noDateItems.length > 0) {
        reservationChecks.push({ label: 'date なし', status: 'warn', value: String(noDateItems.length), items: noDateItems });
      }
      if (noStatusItems.length > 0) {
        reservationChecks.push({ label: 'status なし', status: 'warn', value: String(noStatusItems.length), items: noStatusItems });
      }

      // Orphan check: storeIds in reservations that don't exist in stores
      const orphans = [...storeIdsInReservations].filter(sid => !storeMap.has(sid));
      if (orphans.length > 0) {
        reservationChecks.push({
          label: '孤立予約 (存在しない店舗)',
          status: 'error',
          value: String(orphans.length),
          items: orphans.map(sid => ({ id: sid, label: sid, sublabel: '店舗が存在しません' })),
        });
      }
    } catch (e) {
      reservationChecks.push({ label: 'reservations 読み込み', status: 'error', value: 'failed', detail: String(e) });
    }
    sections.push({ title: '予約', checks: reservationChecks });

    // ─── Store settings (calendar + email) ───
    const settingsChecks: Check[] = [];
    try {
      const settingsSnap = await db.collection('storeSettings').get();
      const total = settingsSnap.size;
      const storeIdsWithCal = new Set<string>();
      const storeIdsWithEmails = new Set<string>();
      for (const d of settingsSnap.docs) {
        if (d.data().calendarId) storeIdsWithCal.add(d.id);
        const e = d.data().notificationEmails;
        if (Array.isArray(e) && e.length > 0) storeIdsWithEmails.add(d.id);
      }

      settingsChecks.push({ label: 'storeSettings ドキュメント', status: 'info', value: String(total) });
      settingsChecks.push({
        label: 'Google Calendar 設定済み',
        status: storeIdsWithCal.size > 0 ? 'ok' : 'warn',
        value: `${storeIdsWithCal.size} / ${storesSnap.size}`,
      });
      settingsChecks.push({
        label: '通知メール設定済み',
        status: storeIdsWithEmails.size > 0 ? 'ok' : 'warn',
        value: `${storeIdsWithEmails.size} / ${storesSnap.size}`,
      });

      // Stores missing a calendar
      const missingCal = storesSnap.docs
        .filter(d => !storeIdsWithCal.has(d.id))
        .map(storeItem);
      if (missingCal.length > 0) {
        settingsChecks.push({
          label: 'カレンダー未設定店舗',
          status: 'warn',
          value: String(missingCal.length),
          items: missingCal,
        });
      }

      // Stores missing notification emails
      const missingEmails = storesSnap.docs
        .filter(d => !storeIdsWithEmails.has(d.id))
        .map(storeItem);
      if (missingEmails.length > 0) {
        settingsChecks.push({
          label: '通知メール未設定店舗',
          status: 'warn',
          value: String(missingEmails.length),
          items: missingEmails,
        });
      }
    } catch (e) {
      settingsChecks.push({ label: 'storeSettings 読み込み', status: 'error', value: 'failed', detail: String(e) });
    }
    sections.push({ title: '店舗設定', checks: settingsChecks });

    // ─── Email (Gmail SMTP) ───
    sections.push({
      title: 'メール (Gmail)',
      checks: [
        envStatus('GMAIL_USER'),
        envStatus('GMAIL_APP_PASSWORD'),
      ],
    });

    // ─── Google Calendar OAuth ───
    const oauthTokenPath = join(process.cwd(), 'scripts', '.oauth-token.json');
    const oauthExists = existsSync(oauthTokenPath);
    sections.push({
      title: 'Google Calendar',
      checks: [
        envStatus('GOOGLE_OAUTH_CLIENT_ID', false),
        envStatus('GOOGLE_OAUTH_CLIENT_SECRET', false),
        {
          label: 'OAuth トークンファイル',
          status: oauthExists ? 'ok' : 'warn',
          value: oauthExists ? 'scripts/.oauth-token.json' : '(未作成)',
          detail: oauthExists
            ? 'ターミナルで実行: npx tsx --env-file=.env.local scripts/oauth-create-calendars.ts'
            : 'OAuth トークンを作成してください: npx tsx --env-file=.env.local scripts/oauth-create-calendars.ts',
        },
      ],
    });

    return NextResponse.json({
      sections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
