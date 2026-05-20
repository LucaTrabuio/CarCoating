import { getAdminDb } from './firebase-admin';
import { DEFAULT_HOMEPAGE_BLOCKS, type HomepageBlock } from './homepage-blocks';

export async function getHomepageLayout(): Promise<HomepageBlock[]> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('site_config').doc('homepage').get();
    if (!doc.exists) return DEFAULT_HOMEPAGE_BLOCKS;
    const data = doc.data();
    if (!data?.blocks || !Array.isArray(data.blocks) || data.blocks.length === 0) {
      return DEFAULT_HOMEPAGE_BLOCKS;
    }
    return data.blocks as HomepageBlock[];
  } catch {
    return DEFAULT_HOMEPAGE_BLOCKS;
  }
}
