import { getAdminDb } from './firebase-admin';
import { DEFAULT_AREA_BLOCKS, type AreaBlock } from './area-blocks';

export async function getAreaLayout(subCompanyId: string): Promise<AreaBlock[]> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('sub_companies').doc(subCompanyId).get();
    if (!doc.exists) return DEFAULT_AREA_BLOCKS;
    const data = doc.data();
    if (!data?.page_layout || !Array.isArray(data.page_layout) || data.page_layout.length === 0) {
      return DEFAULT_AREA_BLOCKS;
    }
    return data.page_layout as AreaBlock[];
  } catch {
    return DEFAULT_AREA_BLOCKS;
  }
}
