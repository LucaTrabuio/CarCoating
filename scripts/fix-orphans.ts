import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ORPHAN_MAPPING: Record<string, { subCompanyId: string; subCompanyName: string; slug: string }> = {
  'osaka-umeda': {
    subCompanyId: 'umeda',
    subCompanyName: '梅田エリア',
    slug: 'umeda',
  },
  'tokyo-shibuya': {
    subCompanyId: 'shibuya',
    subCompanyName: '渋谷エリア',
    slug: 'shibuya',
  },
  'tokyo-shinjuku': {
    subCompanyId: 'shinjuku',
    subCompanyName: '新宿エリア',
    slug: 'shinjuku',
  },
};

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

  for (const [storeId, config] of Object.entries(ORPHAN_MAPPING)) {
    // Check if sub-company already exists
    const scDoc = await db.collection('sub_companies').doc(config.subCompanyId).get();
    if (!scDoc.exists) {
      await db.collection('sub_companies').doc(config.subCompanyId).set({
        id: config.subCompanyId,
        name: config.subCompanyName,
        slug: config.slug,
        stores: [storeId],
        logo_url: '',
        description: '',
      });
      console.log(`✓ Created sub-company: ${config.subCompanyName} (${config.slug})`);
    } else {
      console.log(`  Sub-company already exists: ${config.subCompanyName}`);
    }

    // Update store with sub_company_id
    await db.collection('stores').doc(storeId).update({
      sub_company_id: config.subCompanyId,
      store_slug: storeId.replace(/^(osaka|tokyo)-/, ''),
    });
    console.log(`✓ Linked store ${storeId} → ${config.subCompanyId}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
