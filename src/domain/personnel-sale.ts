import { createPurchaseSession, localizedDemandSummary, offerableStock, packageGrams, repricePackage } from './purchase';
import { purchaseNegotiationContext } from './purchase-negotiation-context';
import { applyMove, createSession } from './negotiation';
import { applyTransaction, realizeProfit, recordDeal, type EconomyState } from './settlement';
import type { Customer, MarketState, PackageLine } from './types';
import { t } from '@i18n/index';

/** One genuine queued buyer, exact full fulfilment, no spending and no hidden auto-profit. */
export function personnelSale(economy: EconomyState, customer: Customer, market: MarketState): EconomyState | null {
  if (customer.intent !== 'buy' || !customer.demand) return null;
  let remaining = customer.demand.quantity;
  const lines: PackageLine[] = [];
  for (const row of offerableStock(customer.demand, economy.inventory, economy.items)) {
    if (row.match !== 'exact') continue;
    const quantity = Math.min(remaining, row.position.quantity);
    if (quantity > 0) lines.push({ itemId: row.item.id, quantity });
    remaining = Math.round((remaining - quantity) * 1000) / 1000;
    if (remaining <= 0) break;
  }
  if (remaining > 0 || lines.length === 0) return null;
  const purchase = repricePackage(createPurchaseSession(customer.demand), lines, economy.items, economy.inventory, customer, market);
  if (purchase.fulfilment !== 'full' || purchase.packageCost <= 0) return null;
  const price = Math.round(purchase.suggestedPrice);
  if (price < Math.ceil(purchase.packageCost * 1.01)) return null;
  const { response } = applyMove(createSession(`staff_${customer.id}`, lines[0]!.itemId),
    purchaseNegotiationContext({ purchase, customer, items: economy.items, market,
      reputation: economy.store.reputation }), { kind: 'offer', amount: price, atRound: 0 });
  if (response.state !== 'ACCEPTED' || response.settledPrice !== price) return null;
  // New arrivals persist their spawn identity even when memory replaces the
  // person id. Legacy queued saves have no visitId: day scopes their fallback.
  const id = `personnel_sale_${customer.visitId ?? `${customer.id}_day${market.day}`}`;
  const outcome = applyTransaction(economy, { txId: id, dealId: id, day: market.day,
    cashDelta: price, itemsIn: [], itemsOut: lines, trustDelta: 0, reputationDelta: 0,
    xpDelta: 0, label: t('Personel satışı · {talep}', { talep: localizedDemandSummary(customer.demand) }) });
  if (!outcome.applied) return null;
  const ledger = recordDeal(realizeProfit(outcome.state.ledger, price, purchase.packageCost), {
    dealId: id, customerId: customer.id, lineIds: [], itemIds: lines.map(line => line.itemId),
    side: 'sell', day: market.day, clockMinutes: market.clockMinutes, testsUsed: [],
    estimateBand: { min: purchase.packageFairValue, max: purchase.packageFairValue }, confidence: 'high',
    actualValue: purchase.packageFairValue, offerHistory: [price], finalState: 'ACCEPTED',
    movesUsed: ['offer'], thesisAtDeal: 'retail', price, costBasis: purchase.packageCost,
    units: purchase.units, grams: packageGrams(lines, economy.items), channel: purchase.channel,
    isBulk: customer.demand.isBulk, realizedProfit: price - purchase.packageCost,
    trustDelta: 0, reputationDelta: 0, reviewData: { missedSignals: [],
      keyDecisionPoint: t('Personel: tam talep ve en az %1 maliyet marjı'), alternativeChannelNote: '' },
  });
  return { ...outcome.state, ledger };
}
