/**
 * Hard-delete the 3 test stores (osaka-umeda, tokyo-shibuya, tokyo-shinjuku)
 * and all associated data: sub-companies, reservations, storeSettings, KPI.
 *
 * Run: npx tsx --env-file=.env.local scripts/delete-test-stores.ts
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const STORE_IDS = ['osaka-umeda', 'tokyo-shibuya', 'tokyo-shinjuku'];
const SUB_COMPANY_IDS = ['umeda', 'shibuya', 'shinjuku'];

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  // 1. Delete reservations referencing these stores
  console.log('1. Deleting reservations...');
  for (const storeId of STORE_IDS) {
    const resSnap = await db.collection('reservations').where('storeId', '==', storeId).get();
    if (resSnap.empty) {
      console.log(`   ${storeId}: 0 reservations`);
      continue;
    }
    const batch = db.batch();
    for (const doc of resSnap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log(`   ${storeId}: deleted ${resSnap.size} reservation(s)`);
  }

  // 2. Delete storeSettings
  console.log('\n2. Deleting storeSettings...');
  for (const storeId of STORE_IDS) {
    const ref = db.collection('storeSettings').doc(storeId);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.delete();
      console.log(`   ${storeId}: deleted`);
    } else {
      console.log(`   ${storeId}: (not found)`);
    }
  }

  // 3. Delete KPI docs + daily subcollections
  console.log('\n3. Deleting KPI data...');
  for (const storeId of STORE_IDS) {
    const dailySnap = await db.collection('kpi').doc(storeId).collection('daily').get();
    if (dailySnap.empty) {
      console.log(`   ${storeId}: 0 daily entries`);
    } else {
      const batch = db.batch();
      for (const doc of dailySnap.docs) batch.delete(doc.ref);
      await batch.commit();
      console.log(`   ${storeId}: deleted ${dailySnap.size} daily entries`);
    }
    // Delete the parent doc (may be phantom but try anyway)
    await db.collection('kpi').doc(storeId).delete();
  }

  // 4. Delete weekly template subcollections (shops/{storeId}/weeklyTemplate)
  console.log('\n4. Deleting shop templates...');
  for (const storeId of STORE_IDS) {
    const templateSnap = await db.collection(`shops/${storeId}/weeklyTemplate`).get();
    if (!templateSnap.empty) {
      const batch = db.batch();
      for (const doc of templateSnap.docs) batch.delete(doc.ref);
      await batch.commit();
      console.log(`   ${storeId}: deleted ${templateSnap.size} template docs`);
    }
    const overrideSnap = await db.collection(`shops/${storeId}/dateOverrides`).get();
    if (!overrideSnap.empty) {
      const batch = db.batch();
      for (const doc of overrideSnap.docs) batch.delete(doc.ref);
      await batch.commit();
      console.log(`   ${storeId}: deleted ${overrideSnap.size} override docs`);
    }
  }

  // 5. Hard-delete store documents
  console.log('\n5. Deleting stores...');
  for (const storeId of STORE_IDS) {
    const ref = db.collection('stores').doc(storeId);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.delete();
      console.log(`   ${storeId}: deleted`);
    } else {
      console.log(`   ${storeId}: (not found)`);
    }
  }

  // 6. Hard-delete sub-company documents
  console.log('\n6. Deleting sub-companies...');
  for (const scId of SUB_COMPANY_IDS) {
    const ref = db.collection('sub_companies').doc(scId);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.delete();
      console.log(`   ${scId}: deleted`);
    } else {
      console.log(`   ${scId}: (not found)`);
    }
  }

  // Verify
  console.log('\n--- Verification ---');
  const storesSnap = await db.collection('stores').get();
  console.log(`Total stores remaining: ${storesSnap.size}`);
  const subsSnap = await db.collection('sub_companies').get();
  console.log(`Total sub-companies remaining: ${subsSnap.size}`);
  const resSnap = await db.collection('reservations').get();
  console.log(`Total reservations remaining: ${resSnap.size}`);
}

main().catch(err => { console.error(err); process.exit(1); });
