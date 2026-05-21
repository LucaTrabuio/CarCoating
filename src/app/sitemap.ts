import type { MetadataRoute } from 'next';
import { getAllV3Stores, getAllSubCompanies } from '@/lib/firebase-stores';
import { getAdminDb } from '@/lib/firebase-admin';
import { SITE_URL as siteUrl } from '@/lib/constants';
import { storeHref } from '@/lib/store-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Landing page
  entries.push({
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  });

  // All active store pages
  try {
    const [stores, subCompanies] = await Promise.all([
      getAllV3Stores(),
      getAllSubCompanies(),
    ]);

    // Build a map from sub_company id → slug for fast lookup
    const scSlugMap = new Map<string, string>();
    for (const sc of subCompanies) {
      scSlugMap.set(sc.id, sc.slug);
    }

    for (const store of stores) {
      const areaSlug = store.sub_company_id ? scSlugMap.get(store.sub_company_id) : undefined;
      const storeUrl = storeHref(store, areaSlug);
      entries.push({
        url: `${siteUrl}${storeUrl}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
      // Key sub-pages
      for (const sub of ['coatings', 'price', 'booking', 'guide', 'access']) {
        entries.push({
          url: `${siteUrl}${storeUrl}/${sub}`,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  } catch (err) {
    console.warn('sitemap: Firestore stores unavailable', err);
  }

  // Blog index
  entries.push({
    url: `${siteUrl}/blog`,
    changeFrequency: 'weekly',
    priority: 0.6,
  });

  // Published blog posts
  try {
    const db = getAdminDb();
    const blogSnap = await db.collection('blog_posts')
      .where('published', '==', true)
      .get();

    for (const doc of blogSnap.docs) {
      const data = doc.data();
      entries.push({
        url: `${siteUrl}/blog/${data.slug}`,
        lastModified: data.updated_at ? new Date(data.updated_at) : undefined,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  } catch (err) {
    console.warn('sitemap: Firestore blog_posts unavailable', err);
  }

  return entries;
}
