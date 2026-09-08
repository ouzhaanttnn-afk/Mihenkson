import { spawnItem } from './item-spawn';
import { bullionMeta } from '@data/bullion';
import { bullionUnitValue, priceForChannel } from './channels';
import { customerPriceBand } from './customer-pricing';
import { PURCHASE } from './balance';
import { poolForTemplate } from './stock-pools';
import type { ItemInstance, MarketState, StoreState } from './types';

/** UI families use existing canonical stock units, not new SKUs or prices. */
export const POOL_SUPPLY = [
  { templateId: 'gram_gold_1', name: 'Gram Altın', gramsPerUnit: 1 },
  { templateId: 'quarter_gold', name: 'Çeyrek Altın', gramsPerUnit: 0 },
  { templateId: 'half_gold', name: 'Yarım Altın', gramsPerUnit: 0 },
  { templateId: 'republic_gold', name: 'Cumhuriyet Altını', gramsPerUnit: 0 },
  { templateId: 'ata_gold', name: 'Ata Lira', gramsPerUnit: 0 },
  { templateId: 'investment_bangle_22k_10', name: '22 Ayar İşçiliksiz Yatırım Bileziği', gramsPerUnit: 10 },
] as const;
/** Sarrafiye gram alımında oyuncuya gösterilen ve kabul edilen en küçük adım. */
export const GRAM_SUPPLY_STEP = 0.1;
export function validPoolSupplyQuantity(templateId: string, quantity: number): boolean {
  if (!POOL_SUPPLY.some(p => p.templateId === templateId) || !Number.isFinite(quantity) || quantity <= 0) return false;
  return templateId === 'gram_gold_1'
    ? Number.isSafeInteger(Math.round(quantity / GRAM_SUPPLY_STEP))
      && Math.abs(Math.round(quantity / GRAM_SUPPLY_STEP) * GRAM_SUPPLY_STEP - quantity) < 1e-9
    : Number.isSafeInteger(quantity) && Number.isSafeInteger(quantity * (templateId === 'quarter_gold' ? 1 : 10000));
}
export function poolSupplyQuote(templateId: string, quantity: number, market: MarketState, store: StoreState) {
  if (!validPoolSupplyQuantity(templateId, quantity)) return null;
  const item = spawnItem(0, 0, templateId);
  const baseUnitValue = bullionUnitValue(item, market);
  const quote = priceForChannel({ item, quantity, market, channel: 'wholesaler', side: 'shopBuys',
    baseUnitValue, relationship: store.supplier.trust });

  /*
   * Hızlı Stok, oyuncuya satılabilir mal kuran perakende tedarik sözleşmesidir;
   * kötü bir küçük-lot toptancı fiyatını aynen geçirmek onboarding'i zarar
   * tuzağına çeviriyordu. Ölçüm örneği: müşteri bandı 4.224–4.324 ₺ iken
   * tezgâh 4.510 ₺ maliyet yazıyor, dolayısıyla hiçbir kârlı teklif kabul
   * edilemiyordu. Tedarik maliyetini, normal müşteri satış bandının üst
   * ucunda en az hedef taban marjı bırakacak şekilde sınırlarız.
   *
   * Bu risksiz arbitraj değildir: çıkış yalnız eşleşen perakende müşterisi
   * geldiğinde vardır; geri toptan satış hâlâ zarar yazar ve piyasa/elde
   * bekleme riski sürer.
   */
  const retailBand = customerPriceBand(item, market, 'shopSells');
  const maxSustainableUnitCost = retailBand
    ? retailBand.max / (1 + PURCHASE.minimumSuggestedProfitMargin)
    : quote.unitPrice;
  const unitPrice = Math.min(quote.unitPrice, maxSustainableUnitCost);
  const totalPrice = Math.round(unitPrice * quantity);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return null;
  if (unitPrice === quote.unitPrice) return quote;

  const spreadRatio = (baseUnitValue - unitPrice) / Math.max(1, baseUnitValue);
  return {
    ...quote,
    unitPrice,
    totalPrice,
    spreadRatio,
    priceImpact: 0,
    breakdown: { product: 0, volume: 0, channel: spreadRatio, regime: 0, volatility: 0, relationship: 0 },
    // Mevcut yerelleştirilmiş kanal gerekçesini koru; denge sınırı
    // oyuncuya yeni ve çevrilmemiş bir teknik metin sızdırmasın.
    rationale: quote.rationale,
  };
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
  const scale = templateId === 'gram_gold_1' ? 1 / GRAM_SUPPLY_STEP : 1;
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
