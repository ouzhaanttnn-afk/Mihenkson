import { liquidationEstimate, type EconomyState } from './settlement';
import { quoteLiquidation } from './wholesaler';
import type { MarketState, TradeNetworkMember } from './types';

export interface RankingSeason { month: string; openingGrams: number }
export function calendarMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Executable wholesale proceeds when available, otherwise existing conservative
 * liquidation value. Customer-owned service items never enter inventory. */
export function rankingWealth(s: EconomyState & { market: MarketState; network: TradeNetworkMember[] }) {
  const stock = s.inventory.reduce((sum, p) => {
    const quote = p.location === 'workshop' ? null : quoteLiquidation(
      { itemId: p.itemId, quantity: p.quantity }, s.items, s.inventory, s.market, s.store, 1);
    return sum + (quote?.gross ?? liquidationEstimate(p).value);
  }, 0);
  const liabilities = s.store.payables.reduce((n, p) => n + p.amount, 0)
    + s.store.supplier.openInvoices.reduce((n, p) => n + p.amount, 0)
    + s.network.reduce((n, member) => n + (member.loan?.totalDue ?? 0), 0);
  const has = (s.store.hasBalanceMg ?? 0) / 1000;
  const netWorth = s.store.cash + stock + has * s.market.goldSpot - liabilities;
  const grams = s.market.goldSpot > 0 ? netWorth / s.market.goldSpot : 0;
  // Game Center accepts integer scores: one score unit = one milligram HAS.
  const score = Math.round(grams * 1000);
  return { netWorth, stock, liabilities, grams, score: Number.isSafeInteger(score) ? score : 0 };
}

export function normalizeRankingSeason(raw: unknown): RankingSeason | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RankingSeason;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) && Number.isFinite(r.openingGrams)
    ? { month: r.month, openingGrams: r.openingGrams } : null;
}

export function seasonFor(previous: RankingSeason | null, grams: number, now = new Date()): RankingSeason {
  const month = calendarMonth(now);
  return previous?.month === month ? previous : { month, openingGrams: grams };
}
