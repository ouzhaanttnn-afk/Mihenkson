import { getTemplate } from '@data/item-templates';
import { rulesFor } from '@data/product-classes';
import type { NegotiationContext } from './negotiation';
import { packageFitPenalty, packagePriceBand, purchaseCeiling } from './purchase';
import type { Customer, FieldKnowledge, ItemInstance, MarketState, Money, PurchaseSession } from './types';
import { trueValue } from './valuation';

interface PurchaseNegotiationInput {
  purchase: PurchaseSession;
  customer: Customer;
  items: Record<string, ItemInstance>;
  market: MarketState;
  reputation: number;
  knowledge?: FieldKnowledge[];
  buyCeiling?: Money;
  patienceLossTolerated?: boolean;
}

/** Manual and staff sales use the same package fit, market anchor and customer limits. */
export function purchaseNegotiationContext({
  purchase, customer, items, market, reputation, knowledge = [], buyCeiling = 0,
  patienceLossTolerated = false,
}: PurchaseNegotiationInput): NegotiationContext {
  const base = purchaseCeiling(customer, purchase.packageFairValue);
  const fulfilmentFactor = purchase.fulfilment === 'full' ? 1 : purchase.fulfilment === 'partial' ? 0.94 : 0.8;
  const { ceilingMultiplier } = packageFitPenalty(purchase.demand, purchase.lines, items);

  // Preserve the manual package rule: the narrowest product governs the band.
  let fair = 0;
  let room = 1;
  let retailSpread = Number.POSITIVE_INFINITY;
  for (const line of purchase.lines) {
    const item = items[line.itemId];
    if (!item) continue;
    const rules = rulesFor(getTemplate(item.templateId));
    fair += trueValue(item, market) * line.quantity;
    room = Math.min(room, rules.haggleRoom);
    retailSpread = Math.min(retailSpread, rules.retailSpread);
  }

  return {
    customer, direction: 'shopSells', reputation, buyCeiling, knowledge,
    economicBand: packagePriceBand(purchase.lines, items, market),
    purchaseCeiling: Math.round(base * fulfilmentFactor * ceilingMultiplier),
    fairValue: fair > 0 ? fair : undefined,
    haggleRoom: fair > 0 ? room : 1,
    retailSpread: fair > 0 && Number.isFinite(retailSpread) ? retailSpread : 0,
    patienceLossTolerated,
  };
}
