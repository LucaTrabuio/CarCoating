import { CarSize, CoatingTier } from './types';
import { coatingTiers } from '@/data/coating-tiers';

export type PriceOverrides = Record<string, Record<string, number>>;

/** Apply a percentage discount to a price, rounded to the nearest yen. */
export function applyDiscount(price: number, discountRate: number): number {
  return Math.round(price * (1 - discountRate / 100));
}

export function parsePriceOverrides(json?: string): PriceOverrides | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getPriceForSize(tier: CoatingTier, size: CarSize, overrides?: PriceOverrides): number {
  if (overrides?.[tier.id]?.[size]) return overrides[tier.id][size];
  return tier.prices[size];
}

export function getWebPrice(tier: CoatingTier, size: CarSize, discountRate: number, overrides?: PriceOverrides): number {
  return applyDiscount(getPriceForSize(tier, size, overrides), discountRate);
}

export function getMaintenancePrice(tier: CoatingTier, size: CarSize): number | null {
  if (!tier.maintenance_prices) return null;
  return tier.maintenance_prices[size];
}

export function getTotalCostOverYears(
  tier: CoatingTier,
  size: CarSize,
  years: number,
  discountRate: number,
  overrides?: PriceOverrides
): number {
  const webPrice = getWebPrice(tier, size, discountRate, overrides);

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
