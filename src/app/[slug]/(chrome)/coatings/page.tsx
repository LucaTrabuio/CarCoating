/*
 * V3 Coatings page — store-specific, with per-tier price blur support
 */

import { notFound } from 'next/navigation';
import { getMasterCoatingTiers } from '@/lib/master-data';
import { resolveSlugToStore, getV3CampaignDefaults } from '@/lib/firebase-stores';
import type { Metadata } from 'next';
import { CoatingsBody } from './CoatingsBody';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  const store = resolved?.store;
  const storeName = resolved?.subCompanyName ?? store?.store_name ?? 'KeePer PRO SHOP';
  const keywords = store?.seo_keywords?.split(/[,、\s]+/).filter(Boolean) ?? [];
  return {
    title: `コーティングメニュー一覧｜${storeName}`,
    description: `${storeName}のカーコーティング全8メニューを詳しく解説。各コースの特徴・構造・耐久年数・価格を比較できます。`,
    ...(keywords.length > 0 ? { keywords } : {}),
  };
}

export default async function V3CoatingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();
  const { store } = resolved;

  const [defaults, coatingTiers] = await Promise.all([
    getV3CampaignDefaults(),
    getMasterCoatingTiers(),
  ]);
  const discountRate = defaults.force_hq_campaign ? defaults.discount : (store.discount_rate ?? defaults.discount);

  return <CoatingsBody store={store} basePath={`/${slug}`} discountRate={discountRate} coatingTiers={coatingTiers} />;
}
