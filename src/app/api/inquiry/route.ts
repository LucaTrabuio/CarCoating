import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminDb } from '@/lib/firebase-admin';
import { getV3StoreById } from '@/lib/firebase-stores';
import { getStoreSettings } from '@/lib/store-settings';
import { sendInquiryConfirmationEmail, sendInquiryNotificationEmail } from '@/lib/email';
import { getMasterCoatingTiers } from '@/lib/master-data';
import { formatPrice, getWebPrice, parsePriceOverrides } from '@/lib/pricing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, name, phone, email, message, selectedTier, vehicleInfo } = body;

    if (!storeId || typeof storeId !== 'string' || !storeId.trim()) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = new Date().toISOString();
    const replyToken = randomUUID();

    const inquiryData = {
      storeId,
      customerName: name.trim(),
      customerPhone: (phone || '').trim(),
      customerEmail: email.trim(),
      vehicleInfo: vehicleInfo?.trim() || null,
      selectedTier: selectedTier || null,
      message: (message || '').trim(),
      status: 'open',
      replyToken,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('inquiries').add(inquiryData);

    // Get store info for emails
    const store = await getV3StoreById(storeId);
    const locationName = store?.store_name || '';
    const locationPhone = store?.tel || '';
    const locationAddress = store?.address || '';

    // Calculate price if tier selected
    let tierName: string | undefined;
    let tierPrice: string | undefined;
    if (selectedTier && store) {
      const tiers = await getMasterCoatingTiers();
      const tier = tiers.find(t => t.id === selectedTier);
      if (tier) {
        tierName = tier.name;
        const discountRate = store.discount_rate || 20;
        const priceOverrides = parsePriceOverrides(store.price_overrides);
        const ssPrice = getWebPrice(tier, 'SS', discountRate, priceOverrides);
        const xlPrice = getWebPrice(tier, 'XL', discountRate, priceOverrides);
        tierPrice = `${formatPrice(ssPrice)}〜${formatPrice(xlPrice)}（税込・Web割引適用）`;
      }
    }

    // Get notification emails
    const settings = await getStoreSettings(storeId);

    // Fire emails
    const emailPromises: Promise<void>[] = [];

    emailPromises.push(
      sendInquiryConfirmationEmail({
        customerEmail: email.trim(),
        customerName: name.trim(),
        locationName,
        locationPhone,
        locationAddress,
        message: (message || '').trim(),
        tierName,
        tierPrice,
      })
    );

    if (settings.notificationEmails.length > 0) {
      emailPromises.push(
        sendInquiryNotificationEmail({
          staffEmail: settings.notificationEmails,
          customerName: name.trim(),
          customerPhone: (phone || '').trim(),
          customerEmail: email.trim(),
          locationName,
          message: (message || '').trim(),
          tierName,
          vehicleInfo: vehicleInfo?.trim(),
        })
      );
    }

    const emailResults = await Promise.allSettled(emailPromises);
    emailResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[inquiry ${docRef.id}] email ${i} failed:`, result.reason);
      }
    });

    // Track KPI
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { FieldValue } = await import('firebase-admin/firestore');
      await db.collection('kpi').doc(storeId).collection('daily').doc(today).set(
        { date: today, inquiries: FieldValue.increment(1), updated_at: now },
        { merge: true }
      );
    } catch { /* KPI tracking is best-effort */ }

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
