export const revalidate = 60;

import type { Metadata } from 'next';
import { getV3StoreById, getAllV3StoreIds, getSubCompanyBySlug } from '@/lib/firebase-stores';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const store = await getV3StoreById(slug);
    if (store) {
      const title = store.hero_title
        ? `${store.hero_title}｜${store.store_name}`
        : `${store.store_name}｜KeePer PRO SHOP`;
      const description = store.meta_description || store.description || `${store.store_name}のカーコーティング。Web予約限定割引あり。`;
      return {
        title,
        description,
        ...(store.seo_keywords ? { keywords: store.seo_keywords.split(/[,、\s]+/).filter(Boolean) } : {}),
        openGraph: { title, description },
      };
    }
    const subCompany = await getSubCompanyBySlug(slug);
    if (subCompany) {
      return { title: `${subCompany.name}｜KeePer PRO SHOP` };
    }
  } catch { /* return defaults */ }
  return {};
}

export async function generateStaticParams() {
  try {
    const ids = await getAllV3StoreIds();
    return ids.map(id => ({ slug: id }));
  } catch {
    return [];
  }
}

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <>{children}</>;
}
