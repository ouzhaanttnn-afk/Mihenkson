import { bullionMeta, isBullion } from '@data/bullion';
import { MARKET_REGIME } from './balance';
import type { ItemInstance, MarketState, TradeSide } from './types';

export const CRAFTED_BANDS = {
  '8K': { metal: .333, buy: [.256, .327], sell: [.364, .416] },
  '14K': { metal: .585, buy: [.450, .575], sell: [.640, .730] },
  '18K': { metal: .750, buy: [.577, .737], sell: [.821, .936] },
  '22K': { metal: .912, buy: [.705, .900], sell: [1.002, 1.143] },
} as const;
export const CUSTOMER_SPREAD = { calm: [200, 250], normal: [300, 350], volatile: [350, 450], shock: [450, 500] } as const;
export function customerSpread(market: MarketState): number {
  const band = CUSTOMER_SPREAD[market.regime];
  const volatilityBand = MARKET_REGIME[market.regime].dailyMove;
  const t = Math.max(0, Math.min(1, (market.volatility - volatilityBand[0]) / (volatilityBand[1] - volatilityBand[0] || 1)));
  return band[0] + (band[1] - band[0]) * t;
}
export function isCrafted(item: ItemInstance): boolean {
  return item.metal === 'gold' && !isBullion(item.templateId) && item.truth.actualKarat in CRAFTED_BANDS;
}
export function customerPriceBand(item: ItemInstance, market: MarketState, side: TradeSide, quantity = 1): { min: number; max: number; reference: number } | null {
  const meta = bullionMeta(item.templateId);
  if (meta && Math.abs(item.truth.actualPurity - meta.unitPurity) > .0002) return null;
  if (meta) {
    const reference = meta.unitWeightGrams * meta.unitPurity * market.goldSpot * quantity;
    const halfSpread = customerSpread(market) * meta.unitWeightGrams * quantity / 2;
    return side === 'shopBuys' ? { min: reference - halfSpread, max: reference, reference }
      : { min: reference, max: reference + halfSpread, reference };
  }
  if (!isCrafted(item)) return null;
  const rule = CRAFTED_BANDS[item.truth.actualKarat as keyof typeof CRAFTED_BANDS];
  const weightValue = item.truth.netMetalWeight * market.goldSpot * quantity;
  const band = side === 'shopBuys' ? rule.buy : rule.sell;
  return { min: weightValue * band[0], max: weightValue * band[1], reference: weightValue * rule.metal };
}
