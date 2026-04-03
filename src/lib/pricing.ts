import { CarSize, CoatingTier } from './types';
import { coatingTiers } from '@/data/coating-tiers';

export function getPriceForSize(tier: CoatingTier, size: CarSize): number {
  return tier.prices[size];
}

export function getWebPrice(tier: CoatingTier, size: CarSize, discountRate: number): number {
  const tierDiscount = Math.min(tier.discount_tier, discountRate);
  const regular = tier.prices[size];
  return Math.round(regular * (1 - tierDiscount / 100));
}

export function getMaintenancePrice(tier: CoatingTier, size: CarSize): number | null {
  if (!tier.maintenance_prices) return null;
  return tier.maintenance_prices[size];
}

export function getTotalCostOverYears(
  tier: CoatingTier,
  size: CarSize,
  years: number,
  discountRate: number
): number {
  const webPrice = getWebPrice(tier, size, discountRate);

  if (!tier.maintenance_prices) {
    // Tiers without maintenance need annual reapplication
    return webPrice * years;
  }

  const maintenancePrice = tier.maintenance_prices[size];
  const maintenanceInterval = tier.maintenance_interval.includes('2年') ? 2 : 1;
  const maintenanceCount = Math.floor((years - 1) / maintenanceInterval);

  return webPrice + maintenanceCount * maintenancePrice;
}

export function getRecommendedTiers(size: CarSize, discountRate: number): CoatingTier[] {
  // Return 3 tiers: entry, recommended, premium
  const crystal = coatingTiers.find(t => t.id === 'crystal')!;
  const diamond = coatingTiers.find(t => t.id === 'diamond')!;
  const ex = coatingTiers.find(t => t.id === 'ex')!;
  return [crystal, diamond, ex];
}

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

export const sizeLabels: Record<CarSize, string> = {
  SS: 'SSサイズ（軽自動車）',
  S: 'Sサイズ（小型車）',
  M: 'Mサイズ（中型車）',
  L: 'Lサイズ（大型車・SUV）',
  LL: 'LLサイズ（ミニバン・大型SUV）',
  XL: 'XLサイズ（大型ミニバン・特大車）',
};
