import { notFound } from 'next/navigation';
import { resolveSlugToStore } from '@/lib/firebase-stores';
import { parseGuideConfig, getCustomizedTiers } from '@/lib/guide-config';
import { getMasterCoatingTiers } from '@/lib/master-data';
import type { Metadata } from 'next';
import { GuideBody } from './GuideBody';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  const storeName = resolved?.subCompanyName ?? resolved?.store.store_name ?? 'KeePer PRO SHOP';
  return {
    title: `コーティングガイド｜${storeName}`,
    description: `カーコーティングの基礎知識、8種類のKeePerコーティングの違い、選び方、お手入れ方法まで、初めての方向けに詳しく解説します。`,
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveSlugToStore(slug);
  if (!resolved) notFound();
  const { store } = resolved;

  const baseTiers = await getMasterCoatingTiers();
  const guideConfig = parseGuideConfig(store.guide_config);
  const tiers = getCustomizedTiers(guideConfig, baseTiers);

  return <GuideBody store={store} basePath={`/${slug}`} tiers={tiers} />;
}
