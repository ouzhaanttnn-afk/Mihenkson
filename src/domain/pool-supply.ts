import { spawnItem } from './item-spawn';
import { bullionMeta } from '@data/bullion';
import { bullionUnitValue, priceForChannel } from './channels';
import { poolForTemplate } from './stock-pools';
import { toMg } from './v5-rules';
import type { ItemInstance, MarketState, StoreState } from './types';

/** UI families use existing canonical stock units, not new SKUs or prices. */
export const POOL_SUPPLY = [
  { templateId: 'gram_gold_1', name: 'Gram Altın', gramsPerUnit: 1 },
  { templateId: 'quarter_gold', name: 'Çeyrek Altın', gramsPerUnit: 0 },
  { templateId: 'investment_bangle_22k_10', name: '22 Ayar İşçiliksiz Yatırım Bileziği', gramsPerUnit: 10 },
] as const;
export function validPoolSupplyQuantity(templateId: string, quantity: number): boolean {
  if (!POOL_SUPPLY.some(p => p.templateId === templateId) || !Number.isFinite(quantity) || quantity <= 0) return false;
  return templateId === 'gram_gold_1'
    ? Number.isSafeInteger(toMg(quantity)) && Math.abs(toMg(quantity) / 1000 - quantity) < 1e-9
    : Number.isSafeInteger(quantity) && Number.isSafeInteger(quantity * (templateId === 'quarter_gold' ? 1 : 10000));
}
export function poolSupplyQuote(templateId: string, quantity: number, market: MarketState, store: StoreState) {
  if (!validPoolSupplyQuantity(templateId, quantity)) return null;
  const item = spawnItem(0, 0, templateId);
  const quote = priceForChannel({ item, quantity, market, channel: 'wholesaler', side: 'shopBuys',
    baseUnitValue: bullionUnitValue(item, market), relationship: store.supplier.trust });
  return Number.isFinite(quote.totalPrice) && quote.totalPrice > 0 ? quote : null;
}
/** Counter sells standard wholesale metal, not the customer's randomized appraisal object. */
export function poolSupplyItem(templateId: string): ItemInstance {
  const item = spawnItem(0, 0, templateId);
  const meta = bullionMeta(templateId)!;
  return { ...item, declared: { ...item.declared, claimedWeight: meta.unitWeightGrams }, truth: { ...item.truth,
    grossWeight: meta.unitWeightGrams, netMetalWeight: meta.unitWeightGrams,
    actualKarat: item.declared.claimedKarat, actualPurity: meta.unitPurity,
    craftsmanship: 0, hiddenFlaws: [], stoneData: { ...item.truth.stoneData, extractableValue: 0 } } };
}
export function validPoolSupplyItem(item: ItemInstance): boolean {
  const meta = bullionMeta(item.templateId);
  return !!meta && POOL_SUPPLY.some(p => p.templateId === item.templateId) &&
    item.truth.hiddenFlaws.length === 0 && item.truth.craftsmanship === 0 &&
    item.truth.stoneData.extractableValue === 0 && item.truth.actualKarat === item.declared.claimedKarat &&
    Math.abs(item.truth.grossWeight - meta.unitWeightGrams) < 1e-9 &&
    Math.abs(item.truth.netMetalWeight - meta.unitWeightGrams) < 1e-9 &&
    Math.abs(item.truth.actualPurity - meta.unitPurity) < 1e-9 &&
    item.declared.claimedWeight !== null && Math.abs(item.declared.claimedWeight - meta.unitWeightGrams) < 1e-9;
}
/** Cash-only counter: quote each amount because existing volume pricing varies. */
export function maxPoolSupplyQuantity(templateId: string, market: MarketState, store: StoreState): number {
  if (!POOL_SUPPLY.some(p => p.templateId === templateId) || !Number.isFinite(store.cash) || store.cash <= 0) return 0;
  const scale = templateId === 'gram_gold_1' ? 1000 : 1;
  const affordable = (ticks: number) => {
    const quote = poolSupplyQuote(templateId, ticks / scale, market, store);
    return !!quote && quote.totalPrice <= store.cash;
  };
  let lo = 0, hi = scale;
  while (affordable(hi) && hi < Number.MAX_SAFE_INTEGER / 20000) { lo = hi; hi *= 2; }
  while (hi - lo > 1) {
    const mid = Math.floor((hi + lo) / 2);
    if (affordable(mid)) lo = mid; else hi = mid;
  }
  return lo / scale;
}
export function hasPoolSupplySpace(templateId: string, inventory: { poolId?: string; location: string }[], store: StoreState) {
  return inventory.some(p => p.poolId === poolForTemplate(templateId) && p.location !== 'workshop') ||
    inventory.filter(p => p.location === 'backStock').length < store.backStockSlots;
}
