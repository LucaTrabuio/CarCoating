import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ScrapedStore {
  storeName: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  phoneLocal?: string;
  businessHours?: string;
  holidays?: string;
}

interface ScrapedData {
  [domain: string]: {
    domain: string;
    url: string;
    company?: string;
    stores: ScrapedStore[];
  };
}

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
  const scraped: ScrapedData = JSON.parse(
    readFileSync(join(process.cwd(), 'scripts', 'scraped-store-info.json'), 'utf8')
  );

  const snap = await db.collection('stores').get();

  // Build a flat index of scraped stores by best-effort name match
  const scrapedByName = new Map<string, ScrapedStore & { domain: string }>();
  for (const [domain, info] of Object.entries(scraped)) {
    if (!info || !info.stores) continue;
    for (const store of info.stores) {
      if (store.storeName) {
        scrapedByName.set(store.storeName, { ...store, domain });
      }
    }
  }

  const missingData: Array<{
    id: string;
    name: string;
    missingTel: boolean;
    missingAddress: boolean;
    scrapedMatch: (ScrapedStore & { domain: string }) | null;
  }> = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const name = d.store_name || '';
    if (d.tel && d.address) continue; // has both

    // Try to find a match in scraped data by name (exact or partial)
    let match: (ScrapedStore & { domain: string }) | null = null;
    if (scrapedByName.has(name)) {
      match = scrapedByName.get(name)!;
    } else {
      // Partial: strip 店, try contains
      const short = name.replace(/店$/, '');
      for (const [scName, scStore] of scrapedByName) {
        if (scName.includes(short) || short.includes(scName.replace(/店$/, ''))) {
          match = scStore;
          break;
        }
      }
    }

    missingData.push({
      id: doc.id,
      name,
      missingTel: !d.tel,
      missingAddress: !d.address,
      scrapedMatch: match,
    });
  }

  console.log(`\nStores with missing data: ${missingData.length}\n`);

  const canAutoFill: typeof missingData = [];
  const needsScrape: typeof missingData = [];

  for (const row of missingData) {
    const status: string[] = [];
    if (row.missingTel) status.push('no-tel');
    if (row.missingAddress) status.push('no-addr');
    console.log(`${row.id.padEnd(30)} ${row.name.padEnd(25)} [${status.join(',')}]`);
    if (row.scrapedMatch) {
      const m = row.scrapedMatch;
      console.log(`  ✓ MATCH in ${m.domain}`);
      if (m.phone || m.phoneLocal) console.log(`    phone: ${m.phone || m.phoneLocal}`);
      if (m.address) console.log(`    address: ${m.address}`);
      canAutoFill.push(row);
    } else {
      console.log(`  ✗ NO MATCH — needs live scrape`);
      needsScrape.push(row);
    }
    console.log('');
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Can auto-fill from scraped JSON: ${canAutoFill.length}`);
  console.log(`Needs live scrape: ${needsScrape.length}`);
  console.log(`\nNeeds live scrape list:`);
  for (const r of needsScrape) {
    console.log(`  ${r.id} (${r.name})`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
