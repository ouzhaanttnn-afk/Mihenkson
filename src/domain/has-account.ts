import { t } from '@i18n/index';
import { priceForChannel } from './channels';
import { spawnItem } from './item-spawn';
import { EXIT_CHANNEL } from './balance';
import { isCrafted } from './customer-pricing';
import { fromMg, roundMoney, isHasTradingDay } from './v5-rules';
import { applyTransaction, type EconomyState, type SettlementOutcome } from './settlement';
import type { MarketState, StoreState } from './types';

export function hasQuote(market: MarketState, store: StoreState) {
  const item = spawnItem(0, 0, 'gram_gold_1');
  // Wholesale maker/spread is retained, but base is 1.000 HAS, not .995 retail gold.
  const common = { item, market, channel: 'wholesaler' as const, quantity: 1, baseUnitValue: market.goldSpot, relationship: store.supplier.trust };
  return { buy: priceForChannel({ ...common, side: 'shopBuys' }).unitPrice,
    sell: priceForChannel({ ...common, side: 'shopSells' }).unitPrice };
}
export function maxHasBuyMg(cash: number, buyPrice: number): number {
  return Number.isFinite(cash) && buyPrice > 0 ? Math.max(0, Math.floor(cash / buyPrice * 1000)) : 0;
}
export function tradeHas(state: EconomyState, market: MarketState, side: 'buy' | 'sell', mg: number, txId: string): SettlementOutcome {
  const reject = (reason: string): SettlementOutcome => ({ applied: false, state, reason });
  if (!isHasTradingDay(market.day)) return reject(t('Geçersiz HAS işlem günü.'));
  if (!Number.isSafeInteger(mg) || mg <= 0) return reject(t('Geçerli bir gram miktarı giriniz (en küçük 0,001 g).'));
  const quote = hasQuote(market, state.store);
  if (!(quote.buy > quote.sell)) return reject(t('HAS fiyat makası geçersiz.'));
  if (side === 'buy' && mg > maxHasBuyMg(state.store.cash, quote.buy)) return reject(t('Yetersiz nakit.'));
  const cost = side === 'buy' ? roundMoney(fromMg(mg) * quote.buy) :
    (state.store.hasCostBasis ?? 0) * mg / Math.max(1, state.store.hasBalanceMg ?? 0);
  return applyTransaction(state, { txId, dealId: txId, day: market.day,
    cashDelta: side === 'buy' ? -cost : roundMoney(fromMg(mg) * quote.sell),
    hasOperation: side, hasDeltaMg: side === 'buy' ? mg : -mg, hasCostDelta: side === 'buy' ? cost : -cost,
    itemsIn: [], itemsOut: [], trustDelta: 0, reputationDelta: 0, xpDelta: 0,
    label:
      side === 'buy'
        ? t('{g} g HAS alımı', { g: fromMg(mg) })
        : t('{g} g HAS satışı', { g: fromMg(mg) }),
  });
}
export function meltToHas(state: EconomyState, market: MarketState, itemId: string): SettlementOutcome {
  const item = state.items[itemId];
  const position = state.inventory.find(p => p.itemId === itemId);
  if (!item || !position || position.location === 'workshop' || !isCrafted(item))
    return { applied: false, state, reason: t('Bu ürün eritilemez.') };
  // Existing .94 recovery and 180 TL refining cost, charged once; never cash proceeds.
  const mg = Math.floor(item.truth.netMetalWeight * item.truth.actualPurity * EXIT_CHANNEL.melt.metalRecovery * 1000);
  if (mg <= 0) return { applied: false, state, reason: t('Kazanılabilir HAS yok.') };
  const cost = position.costBasis / position.quantity;
  const result = applyTransaction(state, { txId: `melt_${itemId}`, dealId: `melt_${itemId}`, day: market.day,
    cashDelta: -EXIT_CHANNEL.melt.refiningFee, hasOperation: 'melt', hasDeltaMg: mg,
    hasCostDelta: cost + EXIT_CHANNEL.melt.refiningFee, itemsIn: [], itemsOut: [{ itemId, quantity: 1 }],
    trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: `${item.displayName} → ${fromMg(mg)} g HAS` });
  if (!result.applied) return result;
  return { ...result, state: { ...result.state, items: { ...result.state.items, [itemId]: { ...result.state.items[itemId]!, location: 'melted' } } } };
}
